'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/governance',
    label: 'Governance',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: '/admin/listings',
    label: 'Listings',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/admin/drafts',
    label: 'Drafts',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: '/admin/agents',
    label: 'Agents',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/ecosystem-partners',
    label: 'Ecosystem Partners',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    href: '/admin/ecosystem-directory',
    label: 'Ecosystem Directory',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/admin/audit-logs',
    label: 'Audit Logs',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? ''

  return (
    <nav className="px-3 py-5">
      <div className="mb-3 px-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Navigation</p>
      </div>
      <div className="space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-amber-400/[0.15] to-amber-400/[0.05] text-white shadow-sm border border-amber-400/[0.15]'
                : 'text-white/55 hover:bg-white/[0.04] hover:text-white/90 border border-transparent'
                }`}
            >
              <span className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-amber-300' : 'text-white/40 group-hover:text-white/70'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AdminShellLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const drawerCls = useMemo(
    () =>
      `fixed inset-0 z-[80] md:hidden ${open ? '' : 'pointer-events-none'}`,
    [open]
  )

  return (
    <>
      <div className="mx-auto flex max-w-[1700px]">
        <aside className="hidden md:flex md:flex-col w-[260px] shrink-0 border-r border-white/[0.06]">
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <NavLinks />
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:hidden mb-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
            >
              <span className="inline-flex items-center justify-center h-6 w-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </span>
              Menu
            </button>
          </div>
          {children}
        </main>
      </div>

      <div className={drawerCls}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-0 left-0 h-full w-[85%] max-w-sm border-r border-white/[0.08] bg-[#0a1019] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'
            }`}
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <div className="h-16 px-6 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-[34px] w-[34px] shrink-0 overflow-hidden items-center justify-center rounded-[12px] bg-[#0b1220] border border-white/[0.08] shadow-lg shadow-black/40 ring-1 ring-black/50 p-0.5 group">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-amber-300/5 opacity-80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_50%)]" />
                <img src="/LOGO.jpeg" alt="MF Logo" className="relative z-10 h-[85%] w-[85%] object-contain drop-shadow-md mix-blend-screen opacity-95 grayscale-[0.1] contrast-125" />
              </div>
              <span className="text-[14px] font-extrabold tracking-wide text-white/95">MillionFlats</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.06] hover:text-white transition-all"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  )
}
