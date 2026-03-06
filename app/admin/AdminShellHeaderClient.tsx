'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { normalizeRole } from '@/lib/rbac'

async function doLogout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null)
  window.location.replace('/')
}

export default function AdminShellHeaderClient() {
  const { data: session, status } = useSession()
  const [busy, setBusy] = useState(false)

  const roleLabel = useMemo(() => {
    const role = normalizeRole((session?.user as any)?.role)
    if (role === 'SUPERADMIN') return 'SUPERADMIN'
    return 'ADMIN'
  }, [session])

  const userInitial = useMemo(() => {
    const name = (session?.user as any)?.name || (session?.user as any)?.email || 'A'
    return name.charAt(0).toUpperCase()
  }, [session])

  return (
    <div className="sticky top-0 z-40 bg-[#0a1019]/80 backdrop-blur-xl border-b border-white/[0.04] flex items-center justify-between gap-4 px-6 lg:px-8 py-4 sm:py-5">
      {/* Brand & Logo Area */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-11 w-11 shrink-0 overflow-hidden items-center justify-center rounded-[16px] bg-[#0b1220] border border-white/[0.08] shadow-2xl shadow-amber-500/10 ring-1 ring-black/50 transition-all hover:scale-105 hover:shadow-amber-500/20 duration-300 p-0.5 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-amber-300/5 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_50%)]" />
          <img src="/LOGO.jpeg" alt="MF Logo" className="relative z-10 h-[85%] w-[85%] object-contain drop-shadow-xl mix-blend-screen opacity-95 grayscale-[0.1] contrast-125" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-[15px] sm:text-base font-extrabold tracking-wide text-white/95 leading-tight">MillionFlats</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex h-[20px] items-center rounded-md bg-gradient-to-r from-amber-400/20 to-amber-500/10 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-400 border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
              {roleLabel}
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20 hidden sm:block" />
            <span className="text-[11px] font-medium text-white/40 tracking-wider hidden sm:block">WORKSPACE</span>
          </div>
        </div>
      </div>

      {/* Right side - User & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Subtle Action Indicators */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          <button className="h-10 w-10 relative rounded-xl flex items-center justify-center text-white/40 hover:bg-white/[0.04] hover:text-white/80 transition-colors">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
        </div>

        <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />

        {/* User Profile Area */}
        <div className="flex items-center gap-3 pl-1 sm:pl-2">
          <div className="hidden sm:flex flex-col items-end justify-center">
            <span className="text-[13px] font-bold text-white/85 leading-none mb-1.5">{(session?.user as any)?.name || 'Admin'}</span>
            <span className="text-[11px] font-medium text-white/40 leading-none">{(session?.user as any)?.email || ''}</span>
          </div>
          <div className="relative cursor-pointer group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/[0.12] shadow-inner text-sm font-bold text-white/80 transition-all duration-300 group-hover:border-white/20">
              {userInitial}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full bg-emerald-500 border-[2.5px] border-[#0a1019]" />
          </div>
        </div>

        {/* Enhanced Logout Button */}
        <button
          type="button"
          disabled={busy || status !== 'authenticated'}
          onClick={async () => {
            if (busy) return
            setBusy(true)
            try {
              await doLogout()
            } finally {
              setBusy(false)
            }
          }}
          className={`group relative h-10 overflow-hidden rounded-xl px-4 ml-1 sm:ml-2 text-[13px] font-semibold transition-all duration-300 ${!busy && status === 'authenticated'
            ? 'bg-white/[0.04] text-white/70 hover:bg-red-500/10 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20'
            : 'bg-white/[0.03] text-white/30 cursor-not-allowed border border-white/[0.05]'
            }`}
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </span>
        </button>
      </div>
    </div>
  )
}
