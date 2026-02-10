'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function AgentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const { data: session, status } = useSession()
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (pathname === '/agent/login' || pathname.startsWith('/agent/login/')) return children
  if (pathname === '/agent/register' || pathname.startsWith('/agent/register/')) return children

  if (status === 'loading') return null
  if (!session?.user || role !== 'AGENT') return null

  return children
}
