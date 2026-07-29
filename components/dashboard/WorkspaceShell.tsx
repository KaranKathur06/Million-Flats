'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { ReactNode } from 'react'

export type WorkspaceRole = 'developer' | 'agency'

export type WorkspaceNavItem = {
  label: string
  href: string
  icon: string
  badge?: string
}

type WorkspaceShellProps = {
  role: WorkspaceRole
  session: Session
  children: ReactNode
  navItems: WorkspaceNavItem[]
  workspaceName: string
  workspaceLabel: string
  statusLabel: string
  completion: number
  initials: string
  accentClass: string
  headerTitle: string
  headerSubtitle: string
  headerActions?: ReactNode[]
  signOutTo: string
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'dashboard':
      return <path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 21h7v-6H4v6Z" />
    case 'projects':
      return <path d="M4 5h16v14H4zM8 9h8M8 13h8" />
    case 'inventory':
      return <path d="M4 7l8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 15l8 4 8-4" />
    case 'analytics':
      return <path d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-5" />
    case 'leads':
      return <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9a8 8 0 1 1 16 0" />
    case 'crm':
      return <path d="M7 8h10M7 12h6M5 19V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14l-4-3H7l-2 3Z" />
    case 'documents':
      return <path d="M7 3h7l5 5v13H7V3Zm7 0v5h5" />
    case 'verification':
      return <path d="M12 3 19 7v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Zm-2 9 2 2 4-5" />
    case 'billing':
      return <path d="M4 7h16M6 11h12M7 15h4M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
    case 'settings':
      return <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8 4h2m-20 0h2m14.1-6.1 1.4-1.4M4.5 19.5l1.4-1.4m0-12.2L4.5 4.5m15 15-1.4-1.4" />
    case 'notifications':
      return <path d="M15 17h5l-1.5-2V11a6.5 6.5 0 1 0-13 0v4L4 17h5m6 0a3 3 0 1 1-6 0" />
    case 'agents':
      return <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m14-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    case 'listings':
      return <path d="M4 7h16M4 12h16M4 17h10" />
    case 'marketing':
      return <path d="M5 19V9m0 10 7-7 4 4 5-8" />
    case 'spark':
      return <path d="m12 3 1.8 5.5H19l-4.6 3.4 1.8 5.6L12 14l-4.7 3.5 1.8-5.6L5 8.5h5.2L12 3Z" />
    default:
      return <path d="M4 7h16M4 12h16M4 17h16" />
  }
}

export function WorkspaceHeader({
  workspaceName,
  workspaceLabel,
  statusLabel,
  completion,
  initials,
  accentClass,
  actions,
  onSignOut,
}: {
  workspaceName: string
  workspaceLabel: string
  statusLabel: string
  completion: number
  initials: string
  accentClass: string
  actions?: ReactNode[]
  onSignOut: () => void
}) {
  return (
    <header className={`sticky top-0 z-30 border-b border-slate-200/80 ${accentClass} backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/20">
              MF
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{workspaceName}</p>
              <p className="truncate text-xs text-slate-500">{workspaceLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm sm:flex">
              Search workspace
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              Sign out
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-sm shadow-slate-200/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{workspaceName}</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-950 truncate">{workspaceLabel}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {statusLabel}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <span className="font-semibold">Ready</span>
              <span>{completion}%</span>
            </div>
            {actions && actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">{actions.map((action, index) => <div key={index}>{action}</div>)}</div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export function WorkspaceHeaderBlock({
  title,
  subtitle,
  completion,
}: {
  title: string
  subtitle: string
  completion: number
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 truncate">{subtitle}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Verified
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <span className="font-semibold">Profile</span>
            <span>{completion}%</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function WorkspaceTabs({ items, pathname }: { items: WorkspaceNavItem[]; pathname: string }) {
  return (
    <nav className="-mt-6 flex gap-2 overflow-x-auto pb-2">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current/10">
              <svg className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <Icon name={item.icon} />
              </svg>
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function WorkspaceStatCard({
  label,
  value,
  detail,
  href,
  icon,
}: {
  label: string
  value: string | number
  detail?: string
  href?: string
  icon: string
}) {
  const card = (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/5 text-slate-700">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <Icon name={icon} />
          </svg>
        </div>
      </div>
    </div>
  )

  if (!href) return card
  return <Link href={href}>{card}</Link>
}

export function WorkspacePanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)] backdrop-blur ${className || ''}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function WorkspaceShell({
  role,
  session,
  children,
  navItems,
  workspaceName,
  workspaceLabel,
  statusLabel,
  completion,
  initials,
  accentClass,
  headerTitle,
  headerSubtitle,
  headerActions,
  signOutTo,
}: WorkspaceShellProps) {
  const pathname = usePathname() || ''
  const user = session.user as any
  const displayName = user?.name || user?.email || workspaceName

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <WorkspaceHeader
        workspaceName={workspaceName}
        workspaceLabel={workspaceLabel}
        statusLabel={statusLabel}
        completion={completion}
        initials={initials}
        accentClass={accentClass}
        actions={headerActions}
        onSignOut={() => signOut({ callbackUrl: signOutTo })}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <WorkspaceHeaderBlock
            title={headerTitle}
            subtitle={headerSubtitle}
            completion={completion}
          />

          <WorkspaceTabs items={navItems} pathname={pathname} />
        </div>

        <div className="mt-5">{children}</div>
      </main>
    </div>
  )
}
