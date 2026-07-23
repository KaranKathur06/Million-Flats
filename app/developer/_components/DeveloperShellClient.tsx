'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import AuthenticatedLayout from '@/components/dashboard/AuthenticatedLayout'

const AUTH_PATHS = [
  '/developer/auth',
  '/developer/login',
  '/developer/register',
  '/developer/forgot-password',
  '/developer/reset-password',
  '/developer/verify-email',
  '/developer/verify',
  '/developer/verify-otp',
]

export default function DeveloperShellClient({ session, children }: { session: Session; children: React.ReactNode }) {
  const pathname = usePathname() || ''
  if (AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <>{children}</>
  }

  return (
    <AuthenticatedLayout role="developer" session={session}>
      {children}
    </AuthenticatedLayout>
  )
}
