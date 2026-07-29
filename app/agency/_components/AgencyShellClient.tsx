'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import WorkspaceShell, { type WorkspaceNavItem } from '@/components/dashboard/WorkspaceShell'

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

  const navItems: WorkspaceNavItem[] = [
    { label: 'Dashboard', href: '/agency/dashboard', icon: 'dashboard' },
    { label: 'Agents', href: '/agency/agents', icon: 'agents' },
    { label: 'Projects', href: '/agency/projects', icon: 'projects' },
    { label: 'Listings', href: '/agency/listings', icon: 'listings' },
    { label: 'Leads', href: '/agency/leads', icon: 'leads' },
    { label: 'CRM', href: '/agency/crm', icon: 'crm' },
    { label: 'Documents', href: '/agency/documents', icon: 'documents' },
    { label: 'Verification', href: '/agency/verification', icon: 'verification' },
    { label: 'Billing', href: '/agency/subscription', icon: 'billing' },
    { label: 'Settings', href: '/agency/settings', icon: 'settings' },
  ]

  const user = session.user as any
  const displayName = user?.name || user?.email || 'Agency'
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase() || 'A'
  const completion = Number(user?.agencyProfileCompletion || user?.profileCompletion || 0)

  return (
    <WorkspaceShell
      role="agency"
      session={session}
      navItems={navItems}
      workspaceName="MillionFlats"
      workspaceLabel="Agency Workspace"
      statusLabel="Active"
      completion={completion}
      initials={initials}
      accentClass="bg-white"
      headerTitle={displayName}
      headerSubtitle="Run agents, listings, projects, and performance signals from a premium operating workspace built for growth-focused agencies."
      signOutTo="/agency/auth"
    >
      {children}
    </WorkspaceShell>
  )
}
