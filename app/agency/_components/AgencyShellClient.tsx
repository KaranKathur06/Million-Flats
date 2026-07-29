'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import WorkspaceShell, { type WorkspaceNavItem } from '@/components/dashboard/WorkspaceShell'
import Link from 'next/link'

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
    { label: 'Marketing', href: '/agency/marketing', icon: 'marketing' },
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
      heroTitle={displayName}
      heroSubtitle="Run agents, listings, projects, and performance signals from a premium operating workspace built for growth-focused agencies."
      heroActions={[
        <Link key="listings" href="/agency/listings" className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
          View Listings
        </Link>,
        <Link key="onboarding" href="/agency/onboarding" className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Continue Setup
        </Link>,
      ]}
    >
      {children}
    </WorkspaceShell>
  )
}
