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
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
          <span className="text-sm font-black text-[#0b1220] tracking-tight">MF</span>
        </div>
        <div>
          <div className="text-[13px] font-bold tracking-wide text-white/90">MillionFlats</div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-[18px] items-center rounded-md bg-amber-400/15 px-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-xs font-bold text-white/70">
          {userInitial}
        </div>

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
          className={`group relative h-9 overflow-hidden rounded-xl px-4 text-[13px] font-semibold transition-all duration-200 ${!busy && status === 'authenticated'
              ? 'bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white border border-white/[0.08] hover:border-white/[0.15]'
              : 'bg-white/[0.03] text-white/30 cursor-not-allowed border border-white/[0.05]'
            }`}
        >
          <span className="relative z-10 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </span>
        </button>
      </div>
    </div>
  )
}
