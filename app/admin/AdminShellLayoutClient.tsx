'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const nav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/governance', label: 'Governance' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/drafts', label: 'Drafts' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/ecosystem-partners', label: 'Ecosystem Partners' },
  { href: '/admin/ecosystem-directory', label: 'Ecosystem Directory' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="px-3 py-6">
      <div className="space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
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
        <aside className="hidden md:block w-[260px] shrink-0 border-r border-white/10">
          <NavLinks />
        </aside>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
          <div className="md:hidden mb-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              <span className="inline-flex items-center justify-center h-6 w-6">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute top-0 left-0 h-full w-[86%] max-w-sm border-r border-white/10 bg-[#0b1220] shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
            <div className="text-sm font-semibold tracking-wide text-white/80">MillionFlats</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
