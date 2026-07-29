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
    { label: 'Leads', href: '/developer/leads', icon: 'leads' },
    { label: 'Verification', href: '/developer/verification', icon: 'verification' },
    { label: 'Billing', href: '/developer/subscription', icon: 'billing' },
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
      headerActions={[
        <Link key="projects" href="/developer/projects" className="inline-flex items-center rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
          Projects
        </Link>,
        <Link key="verification" href="/developer/verification" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50">
          Verification
        </Link>,
      ]}
      signOutTo="/developer/login"
    >
      {children}
    </WorkspaceShell>
  )
}
