'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { isAdminPanelRole } from '@/lib/roleHomeRoute'

const AUTH_PREFIXES = ['/auth', '/user/login', '/user/register', '/agent/login', '/agent/register']
const DownloadGatePopup = dynamic(() => import('@/components/lead-magnets/DownloadGatePopup'), { ssr: false })
const PostLoginActionHandler = dynamic(() => import('@/components/lead-magnets/PostLoginActionHandler'), { ssr: false })

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (pathname !== '/') return
    if (status !== 'authenticated') return
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (!isAdminPanelRole(role)) return
    router.replace('/admin')
  }, [pathname, router, session, status])

  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname?.startsWith(p))
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/')
  const isAgentRoute = pathname === '/agent' || pathname?.startsWith('/agent/')

  if (isAuthRoute || isAdminRoute || isAgentRoute) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Header />
      <PostLoginActionHandler />
      <main className="min-h-screen">{children}</main>
      <DownloadGatePopup />
      <Footer />
    </>
  )
}
