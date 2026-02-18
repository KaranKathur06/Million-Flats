'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const AUTH_PREFIXES = ['/auth', '/user/login', '/user/register', '/agent/login', '/agent/register']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname?.startsWith(p))
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/')

  if (isAuthRoute || isAdminRoute) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
