'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'

type Role = 'developer' | 'agency' | 'agent' | 'buyer' | 'admin'

type NavItem = {
  label: string
  href: string
  icon: string
  badge?: string
}

type RoleConfig = {
  role: Role
  label: string
  home: string
  accent: string
  active: string
  signOutTo: string
  nav: NavItem[]
}

const ICONS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z',
  projects: 'M4 21V5a2 2 0 012-2h12a2 2 0 012 2v16M8 7h8M8 11h8M8 15h5',
  analytics: 'M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-5',
  inventory: 'M4 7l8-4 8 4-8 4-8-4zm0 4l8 4 8-4M4 15l8 4 8-4',
  pricing: 'M12 3v18m6-14H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6',
  sales: 'M4 19l5-5 4 4 7-9M14 9h6v6',
  leads: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-12 9a8 8 0 0116 0',
  crm: 'M7 8h10M7 12h6m-9 8V5a2 2 0 012-2h12a2 2 0 012 2v15l-4-3H6l-2 3z',
  documents: 'M7 3h7l5 5v13H7V3zm7 0v5h5',
  media: 'M4 5h16v14H4V5zm3 11l4-4 3 3 2-2 3 3',
  ai: 'M12 3l1.8 5.5h5.7l-4.6 3.4 1.8 5.6L12 14l-4.7 3.5 1.8-5.6-4.6-3.4h5.7L12 3z',
  verification: 'M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4zm-3 9l2 2 4-5',
  subscription: 'M4 7h16M6 11h12M7 15h4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  team: 'M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m14-10a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6z',
  settings: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8 4h2m-20 0h2m14.1-6.1l1.4-1.4M4.5 19.5l1.4-1.4m0-12.2L4.5 4.5m15 15l-1.4-1.4',
  support: 'M12 18h.01M9.1 9a3 3 0 115.8 1c-.9 1.3-2.9 1.7-2.9 3.5',
  notifications: 'M15 17h5l-1.5-2V11a6.5 6.5 0 10-13 0v4L4 17h5m6 0a3 3 0 11-6 0',
}

const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  developer: {
    role: 'developer',
    label: 'Developer Workspace',
    home: '/developer/dashboard',
    accent: 'from-blue-950 via-slate-950 to-zinc-950',
    active: 'bg-blue-500/15 text-white border-blue-300/20',
    signOutTo: '/developer/login',
    nav: [
      { label: 'Dashboard', href: '/developer/dashboard', icon: 'dashboard' },
      { label: 'Projects', href: '/developer/projects', icon: 'projects' },
      { label: 'Project Library', href: '/developer/projects', icon: 'inventory' },
      { label: 'Project Analytics', href: '/developer/analytics', icon: 'analytics' },
      { label: 'Inventory', href: '/developer/inventory', icon: 'inventory' },
      { label: 'Pricing', href: '/developer/pricing', icon: 'pricing' },
      { label: 'Sales', href: '/developer/sales', icon: 'sales' },
      { label: 'Leads', href: '/developer/leads', icon: 'leads' },
      { label: 'CRM', href: '/developer/crm', icon: 'crm' },
      { label: 'Investors', href: '/developer/investors', icon: 'team' },
      { label: 'Documents', href: '/developer/documents', icon: 'documents' },
      { label: 'Media', href: '/developer/media', icon: 'media' },
      { label: 'AI Tools', href: '/developer/ai-tools', icon: 'ai' },
      { label: 'Verification', href: '/developer/verification', icon: 'verification' },
      { label: 'Subscription', href: '/developer/subscription', icon: 'subscription' },
      { label: 'Team', href: '/developer/team', icon: 'team' },
      { label: 'Settings', href: '/developer/settings', icon: 'settings' },
      { label: 'Support', href: '/developer/support', icon: 'support' },
      { label: 'Notifications', href: '/developer/notifications', icon: 'notifications' },
    ],
  },
  agency: {
    role: 'agency',
    label: 'Agency Workspace',
    home: '/agency/dashboard',
    accent: 'from-stone-950 via-zinc-950 to-amber-950',
    active: 'bg-amber-400/15 text-white border-amber-300/20',
    signOutTo: '/agency/auth',
    nav: [
      { label: 'Dashboard', href: '/agency/dashboard', icon: 'dashboard' },
      { label: 'Properties', href: '/agency/properties', icon: 'projects' },
      { label: 'Developers', href: '/agency/developers', icon: 'inventory' },
      { label: 'Agents', href: '/agency/agents', icon: 'team' },
      { label: 'Leads', href: '/agency/leads', icon: 'leads' },
      { label: 'CRM', href: '/agency/crm', icon: 'crm' },
      { label: 'Marketing', href: '/agency/marketing', icon: 'media' },
      { label: 'Campaigns', href: '/agency/campaigns', icon: 'sales' },
      { label: 'Analytics', href: '/agency/analytics', icon: 'analytics' },
      { label: 'Listings', href: '/agency/listings', icon: 'inventory' },
      { label: 'Verification', href: '/agency/verification', icon: 'verification' },
      { label: 'Subscription', href: '/agency/subscription', icon: 'subscription' },
      { label: 'Documents', href: '/agency/documents', icon: 'documents' },
      { label: 'Finance', href: '/agency/finance', icon: 'pricing' },
      { label: 'Invoices', href: '/agency/invoices', icon: 'documents' },
      { label: 'Settings', href: '/agency/settings', icon: 'settings' },
      { label: 'Support', href: '/agency/support', icon: 'support' },
      { label: 'Notifications', href: '/agency/notifications', icon: 'notifications' },
    ],
  },
  agent: { role: 'agent', label: 'Agent Workspace', home: '/agent/dashboard', accent: 'from-slate-950 via-blue-950 to-slate-950', active: 'bg-blue-500/15 text-white border-blue-300/20', signOutTo: '/agent/auth', nav: [] },
  buyer: { role: 'buyer', label: 'Buyer Workspace', home: '/user/dashboard', accent: 'from-slate-950 via-zinc-950 to-slate-950', active: 'bg-slate-500/15 text-white border-white/10', signOutTo: '/user/login', nav: [] },
  admin: { role: 'admin', label: 'Admin Workspace', home: '/admin/dashboard', accent: 'from-zinc-950 via-slate-950 to-zinc-950', active: 'bg-white/10 text-white border-white/10', signOutTo: '/admin/login', nav: [] },
}

function NavSvg({ name }: { name: string }) {
  return (
    <svg className="h-4.5 w-4.5 shrink-0" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name] || ICONS.dashboard} />
    </svg>
  )
}

export default function AuthenticatedLayout({
  role,
  session,
  children,
}: {
  role: Role
  session: Session
  children: ReactNode
}) {
  const pathname = usePathname() || ''
  const [open, setOpen] = useState(false)
  const config = ROLE_CONFIGS[role]
  const user = session.user as any
  const displayName = user?.name || user?.email || config.label
  const completion = role === 'developer' ? user?.developerProfileCompletion : role === 'agency' ? user?.agencyProfileCompletion : user?.profileCompletion
  const initials = useMemo(() => displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase() || 'MF', [displayName])

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-slate-950">
      {open ? <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/45 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b ${config.accent} text-white transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <Link href={config.home} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950 shadow-lg shadow-black/20">MF</span>
              <span>
                <span className="block text-sm font-semibold">MillionFlats</span>
                <span className="block text-xs text-white/45">{config.label}</span>
              </span>
            </Link>
          </div>

          <div className="px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-bold">{initials}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{displayName}</span>
                  <span className="block text-xs text-white/45">{completion || 0}% profile complete</span>
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white/75 transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(completion || 0)))}%` }} />
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="space-y-1">
              {config.nav.map((item) => {
                const active = pathname === item.href || (item.href !== config.home && pathname.startsWith(item.href))
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${active ? config.active : 'border-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.07] hover:text-white'}`}
                    onClick={() => setOpen(false)}
                  >
                    <NavSvg name={item.icon} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{item.badge}</span> : null}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              onClick={() => signOut({ callbackUrl: config.signOutTo })}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-white/58 transition-all hover:border-red-300/15 hover:bg-red-500/10 hover:text-white"
            >
              <NavSvg name="support" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 lg:hidden" aria-label="Open menu">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{config.label}</p>
              <p className="text-sm font-semibold text-slate-900">Command center</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link href={role === 'agency' ? '/agency/notifications' : '/developer/notifications'} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900" aria-label="Notifications">
                <NavSvg name="notifications" />
              </Link>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-white">{initials}</span>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}
