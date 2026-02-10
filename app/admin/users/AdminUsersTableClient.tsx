'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  status: string
  emailVerified: boolean
  createdAt: string
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.success) {
    throw new Error(safeString(json?.message) || 'Request failed')
  }
  return json
}

export default function AdminUsersTableClient({
  items,
  currentRole,
}: {
  items: UserRow[]
  currentRole: unknown
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const caps = useMemo(() => getAdminCapabilities(currentRole), [currentRole])

  const doAction = async (id: string, fn: () => Promise<void>) => {
    if (busyId) return
    setBusyId(id)
    setError('')
    try {
      await fn()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      {error ? <p className="mb-4 text-sm font-semibold text-red-300">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70 border-b border-white/10">
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Verified</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const isBusy = busyId === u.id
              const targetRole = safeString(u.role).toUpperCase()
              const status = safeString(u.status || 'ACTIVE').toUpperCase() || 'ACTIVE'

              const isTargetSuperadmin = targetRole === 'SUPERADMIN'

              const canVerifyEmail = caps.users.verifyEmail
              const canBan = caps.users.ban && !isTargetSuperadmin && status !== 'BANNED'
              const canDelete = caps.users.delete && !isTargetSuperadmin
              const canRoleChange = caps.users.changeRole && !isTargetSuperadmin

              const verifyTitle = canVerifyEmail ? '' : 'Forbidden'
              const banTitle = caps.users.ban ? (isTargetSuperadmin ? 'Forbidden' : '') : 'Forbidden'
              const deleteTitle = caps.users.delete ? (isTargetSuperadmin ? 'Forbidden' : '') : 'Forbidden'
              const roleTitle = caps.users.changeRole ? (isTargetSuperadmin ? 'Forbidden' : '') : 'Forbidden'

              return (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-4 pr-4 text-white">{safeString(u.email)}</td>
                  <td className="py-4 pr-4 text-white/80">{safeString(u.name) || '—'}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {safeString(u.role) || 'USER'}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        status === 'BANNED'
                          ? 'border-red-500/30 bg-red-500/10 text-red-200'
                          : status === 'SUSPENDED'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                            : 'border-white/10 bg-black/20 text-white/90'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{u.emailVerified ? 'Yes' : 'No'}</td>
                  <td className="py-4 pr-4 text-white/70">{u.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {u.emailVerified ? (
                        <span className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold border border-green-500/30 bg-green-500/10 text-green-200">
                          Verified
                        </span>
                      ) : (
                        <button
                          title={verifyTitle}
                          disabled={!canVerifyEmail || isBusy}
                          onClick={() =>
                            doAction(u.id, async () => {
                              const ok = window.confirm('Mark this user email as verified?')
                              if (!ok) return
                              await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/verify-email`)
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canVerifyEmail && !isBusy
                              ? 'border border-white/10 bg-transparent text-white/90 hover:bg-white/5'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          Verify email
                        </button>
                      )}

                      <button
                        title={banTitle}
                        disabled={!canBan || isBusy}
                        onClick={() =>
                          doAction(u.id, async () => {
                            const ok = window.confirm('Ban this user? This disables login.')
                            if (!ok) return
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/ban`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canBan && !isBusy
                            ? 'bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/25'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Ban
                      </button>

                      <button
                        title={roleTitle}
                        disabled={!canRoleChange || isBusy}
                        onClick={() =>
                          doAction(u.id, async () => {
                            const nextRole = targetRole === 'ADMIN' ? 'USER' : 'ADMIN'
                            const ok = window.confirm(`Change role to ${nextRole}?`)
                            if (!ok) return
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/role`, { role: nextRole })
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canRoleChange && !isBusy
                            ? 'border border-white/10 bg-transparent text-white/90 hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {targetRole === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                      </button>

                      <button
                        title={deleteTitle}
                        disabled={!canDelete || isBusy}
                        onClick={() =>
                          doAction(u.id, async () => {
                            const ok = window.confirm('Delete this user? This is permanent.')
                            if (!ok) return
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/delete`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canDelete && !isBusy
                            ? 'border border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-white/60">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
