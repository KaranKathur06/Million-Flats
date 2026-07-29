'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import WorkspaceShell, { type WorkspaceNavItem } from '@/components/dashboard/WorkspaceShell'
import Link from 'next/link'

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

  const navItems: WorkspaceNavItem[] = [
    { label: 'Dashboard', href: '/developer/dashboard', icon: 'dashboard' },
    { label: 'Projects', href: '/developer/projects', icon: 'projects' },
    { label: 'Inventory', href: '/developer/inventory', icon: 'inventory' },
    { label: 'Leads', href: '/developer/leads', icon: 'leads' },
    { label: 'CRM', href: '/developer/crm', icon: 'crm' },
    { label: 'Analytics', href: '/developer/analytics', icon: 'analytics' },
    { label: 'Documents', href: '/developer/documents', icon: 'documents' },
    { label: 'Verification', href: '/developer/verification', icon: 'verification' },
    { label: 'Billing', href: '/developer/subscription', icon: 'billing' },
    { label: 'Settings', href: '/developer/settings', icon: 'settings' },
  ]

  const user = session.user as any
  const displayName = user?.name || user?.email || 'Developer'
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase() || 'D'
  const completion = Number(user?.developerProfileCompletion || user?.profileCompletion || 0)

  return (
    <WorkspaceShell
      role="developer"
      session={session}
      navItems={navItems}
      workspaceName="MillionFlats"
      workspaceLabel="Developer Workspace"
      statusLabel="Verified"
      completion={completion}
      initials={initials}
      accentClass="bg-white"
      headerTitle={displayName}
      headerSubtitle="Coordinate projects, lead health, inventory readiness, and verification status from a premium workspace designed for modern developers."
      signOutTo="/developer/login"
    >
      {children}
    </WorkspaceShell>
  )
}
