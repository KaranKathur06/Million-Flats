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
    if (role === 'SUPERADMIN') return 'SUPERADMIN Dashboard'
    return 'ADMIN Dashboard'
  }, [session])

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-6">
      <div>
        <div className="text-sm font-semibold tracking-wide text-white/80">MillionFlats</div>
        <div className="mt-1 font-serif text-xl font-bold">{roleLabel}</div>
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
        className={`h-10 rounded-xl px-4 text-sm font-semibold ${
          !busy && status === 'authenticated'
            ? 'bg-white/10 text-white hover:bg-white/15'
            : 'bg-white/5 text-white/40 cursor-not-allowed'
        }`}
      >
        Logout
      </button>
    </div>
  )
}
