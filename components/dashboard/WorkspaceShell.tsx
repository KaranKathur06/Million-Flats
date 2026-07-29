'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'

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
  navItems,
  pathname,
  onSignOut,
  homeHref,
}: {
  workspaceName: string
  workspaceLabel: string
  statusLabel: string
  completion: number
  initials: string
  accentClass: string
  navItems: WorkspaceNavItem[]
  pathname: string
  onSignOut: () => void
  homeHref: string
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = () => setProfileMenuOpen(false)
    if (profileMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [profileMenuOpen])

  const completionLabel = completion < 100 ? `${completion}% Complete` : 'Complete'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href={homeHref} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/20">
              MF
            </div>
            <div className="hidden min-w-0 items-center gap-1 sm:flex">
              <div>
                <p className="text-sm font-semibold text-slate-950">{workspaceName}</p>
                <p className="text-xs text-slate-500">{workspaceLabel}</p>
              </div>
            </div>
          </Link>

          <div className="hidden flex-1 justify-center md:flex">
            <WorkspaceNavigation items={navItems} pathname={pathname} />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              <span className="font-semibold">{completionLabel}</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setProfileMenuOpen(!profileMenuOpen)
                }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open profile menu"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {initials}
                </div>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-950">{workspaceName}</p>
                    <p className="text-xs text-slate-500 truncate">{workspaceLabel}</p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>Sign Out</span>
                      <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle workspace menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <WorkspaceNavigation items={navItems} pathname={pathname} />
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span>Status</span>
                <span className="font-semibold">{statusLabel}</span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export function WorkspaceSummary({
  title,
  subtitle,
  workspaceLabel,
  statusLabel,
  completion,
}: {
  title: string
  subtitle: string
  workspaceLabel: string
  statusLabel: string
  completion: number
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/30">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{workspaceLabel}</span>
            <span className="rounded-full border border-slate-200 bg-emerald-50 px-3 py-1 text-emerald-700">{statusLabel}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Profile Completion</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{completion}%</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">{workspaceLabel}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function WorkspaceNavigation({ items, pathname }: { items: WorkspaceNavItem[]; pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="space-y-2">
      <div className="hidden overflow-x-auto sm:block">
        <nav className="flex gap-1 whitespace-nowrap" aria-label="Primary workspace navigation">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition ${active ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-expanded={menuOpen}
          aria-label="Toggle workspace navigation"
        >
          Modules
          <span>{menuOpen ? 'Close' : 'Open'}</span>
        </button>
        {menuOpen ? (
          <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {items.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
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
        navItems={navItems}
        pathname={pathname}
        onSignOut={() => signOut({ callbackUrl: signOutTo })}
        homeHref={role === 'agency' ? '/agency/dashboard' : '/developer/dashboard'}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <WorkspaceSummary
            title={headerTitle}
            subtitle={headerSubtitle}
            workspaceLabel={workspaceLabel}
            statusLabel={statusLabel}
            completion={completion}
          />
        </div>

        <div className="mt-5">{children}</div>
      </main>
    </div>
  )
}
