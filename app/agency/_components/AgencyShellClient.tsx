'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import AuthenticatedLayout from '@/components/dashboard/AuthenticatedLayout'

const AUTH_PATHS = [
  '/agency/auth',
  '/agency/login',
  '/agency/register',
  '/agency/forgot-password',
  '/agency/reset-password',
  '/agency/verify-email',
  '/agency/verify',
  '/agency/verify-otp',
]

export default function AgencyShellClient({
  session,
  children,
}: {
  session: Session
  children: React.ReactNode
}) {
  const pathname = usePathname() || ''
  if (AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <>{children}</>
  }

  return (
    <AuthenticatedLayout role="agency" session={session}>
      {children}
    </AuthenticatedLayout>
  )
}
