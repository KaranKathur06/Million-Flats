'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import AgentNavbar from '@/app/_components/agent/AgentNavbar'
import { AgentStatus } from '@/lib/agentLifecycle'

const EXCLUDED_PATHS_FROM_LAYOUT = [
  '/agent/login',
  '/agent/register',
  '/agent/verify-email',
  '/agent/verify',
  '/agent/onboarding',
  '/agent/on-hold',
  '/agent/rejected',
]

interface AgentData {
  status: AgentStatus
  profileCompletion: number
  profileImageUrl?: string
}

export default function AgentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const { data: session, status } = useSession()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const [agentData, setAgentData] = useState<AgentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Pages that don't get the navbar layout
  const isExcluded = EXCLUDED_PATHS_FROM_LAYOUT.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // Fetch agent data for navbar
  useEffect(() => {
    if (status === 'loading' || !session?.user || role !== 'AGENT' || isExcluded) {
      setIsLoading(false)
      return
    }

    const fetchAgentData = async () => {
      try {
        const res = await fetch('/api/agent/profile-data')
        if (res.ok) {
          const data = await res.json()
          setAgentData({
            status: data.status || 'REGISTERED',
            profileCompletion: data.profileCompletion || 0,
            profileImageUrl: data.profileImageUrl,
          })
        }
      } catch (error) {
        console.error('Failed to fetch agent data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgentData()
  }, [session, status, role, isExcluded])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session?.user || role !== 'AGENT') return null

  if (isExcluded) return <>{children}</>

  const agentName = String((session.user as any)?.name || 'Agent')
  const agentEmail = String((session.user as any)?.email || '')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <AgentNavbar
        agentStatus={agentData?.status || 'REGISTERED'}
        agentName={agentName}
        agentEmail={agentEmail}
        profileImageUrl={agentData?.profileImageUrl}
        profileCompletion={agentData?.profileCompletion}
      />

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
