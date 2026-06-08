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

const ALL_ROLES = ['USER', 'AGENT', 'MODERATOR', 'VERIFIER', 'ADMIN', 'SUPERADMIN'] as const

const ROLE_POWER: Record<string, number> = {
  USER: 1,
  AGENT: 2,
  MODERATOR: 3,
  VERIFIER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function getRoleBadge(role: string) {
  switch (role.toUpperCase()) {
    case 'SUPERADMIN':
      return 'border-purple-500/30 bg-purple-500/10 text-purple-300'
    case 'ADMIN':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    case 'VERIFIER':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'MODERATOR':
      return 'border-teal-500/30 bg-teal-500/10 text-teal-300'
    case 'AGENT':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    default:
      return 'border-white/10 bg-black/20 text-white/70'
  }
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
  const [success, setSuccess] = useState('')

  // Role change modal state
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null)
  const [selectedRole, setSelectedRole] = useState('')

  const caps = useMemo(() => getAdminCapabilities(currentRole), [currentRole])
  const actorRole = safeString(currentRole).toUpperCase()
  const actorPower = ROLE_POWER[actorRole] || 0

  // Get allowed roles this actor can assign
  const getAllowedRoles = (targetCurrentRole: string) => {
    if (actorRole === 'SUPERADMIN') return ALL_ROLES.filter((r) => r !== targetCurrentRole)
    // ADMIN can assign roles below own level
    return ALL_ROLES.filter((r) => ROLE_POWER[r] < actorPower && r !== targetCurrentRole)
  }

  const doAction = async (id: string, fn: () => Promise<void>) => {
    if (busyId) return
    setBusyId(id)
    setError('')
    setSuccess('')
    try {
      await fn()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusyId('')
    }
  }

  const openRoleModal = (user: UserRow) => {
    setRoleModalUser(user)
    setSelectedRole('')
    setError('')
    setSuccess('')
  }

  const confirmRoleChange = async () => {
    if (!roleModalUser || !selectedRole) return
    setBusyId(roleModalUser.id)
    setError('')
    setSuccess('')
    try {
      await postJson(`/api/admin/users/${encodeURIComponent(roleModalUser.id)}/role`, { role: selectedRole })
      setSuccess(`Role changed to ${selectedRole}`)
      setRoleModalUser(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Role change failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      {error && <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300">{error}</p>}
      {success && <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-300">{success}</p>}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((u) => {
          const isBusy = busyId === u.id
          const targetRole = safeString(u.role).toUpperCase() || 'USER'
          const status = safeString(u.status || 'ACTIVE').toUpperCase() || 'ACTIVE'
          const isTargetSuperadmin = targetRole === 'SUPERADMIN'
          const canTargetBeModified = actorRole === 'SUPERADMIN' || ROLE_POWER[targetRole] < actorPower

          const canVerifyEmail = caps.users.verifyEmail
          const canBan = caps.users.ban && !isTargetSuperadmin && status !== 'BANNED'
          const canDelete = caps.users.delete && !isTargetSuperadmin
          const canRoleChange = caps.users.changeRole && canTargetBeModified

          return (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold break-all">{safeString(u.email)}</div>
                  <div className="mt-1 text-xs text-white/70">{safeString(u.name) || '—'}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getRoleBadge(targetRole)}`}>
                    {targetRole}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${status === 'BANNED' ? 'border-red-500/30 bg-red-500/10 text-red-200'
                    : status === 'SUSPENDED' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'border-white/10 bg-black/20 text-white/90'
                    }`}>
                    {status}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/80">
                <div>
                  <div className="text-white/50">Verified</div>
                  <div className={`font-semibold ${u.emailVerified ? 'text-emerald-400' : 'text-white/90'}`}>{u.emailVerified ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-white/50">Created</div>
                  <div className="font-semibold text-white/90">{u.createdAt || '—'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {u.emailVerified ? (
                  <span className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold border border-green-500/30 bg-green-500/10 text-green-200">
                    Verified
                  </span>
                ) : (
                  <button
                    disabled={!canVerifyEmail || isBusy}
                    onClick={() => doAction(u.id, async () => {
                      const ok = window.confirm('Mark this user email as verified?')
                      if (!ok) return
                      await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/verify-email`)
                    })}
                    className={`h-9 rounded-lg px-3 text-xs font-semibold ${canVerifyEmail && !isBusy ? 'border border-white/10 bg-transparent text-white/90 hover:bg-white/5' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                  >
                    Verify email
                  </button>
                )}

                {canRoleChange && (
                  <button
                    onClick={() => openRoleModal(u)}
                    disabled={isBusy}
                    className="h-9 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 text-xs font-bold text-amber-300 hover:bg-amber-400/10 transition-all disabled:opacity-50"
                  >
                    Change Role
                  </button>
                )}

                <button
                  disabled={!canBan || isBusy}
                  onClick={() => doAction(u.id, async () => {
                    const ok = window.confirm('Ban this user? This disables login.')
                    if (!ok) return
                    await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/ban`)
                  })}
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${canBan && !isBusy ? 'bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/25' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                >
                  Ban
                </button>

                <button
                  disabled={!canDelete || isBusy}
                  onClick={() => doAction(u.id, async () => {
                    const ok = window.confirm('Delete this user? This is permanent.')
                    if (!ok) return
                    await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/delete`)
                  })}
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${canDelete && !isBusy ? 'border border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {items.length === 0 ? <div className="py-10 text-center text-white/60">No users found.</div> : null}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-white/40 border-b border-white/[0.08]">
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
              const targetRole = safeString(u.role).toUpperCase() || 'USER'
              const status = safeString(u.status || 'ACTIVE').toUpperCase() || 'ACTIVE'
              const isTargetSuperadmin = targetRole === 'SUPERADMIN'
              const canTargetBeModified = actorRole === 'SUPERADMIN' || ROLE_POWER[targetRole] < actorPower

              const canVerifyEmail = caps.users.verifyEmail
              const canBan = caps.users.ban && !isTargetSuperadmin && status !== 'BANNED'
              const canDelete = caps.users.delete && !isTargetSuperadmin
              const canRoleChange = caps.users.changeRole && canTargetBeModified

              return (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors">
                  <td className="py-4 pr-4 text-white">{safeString(u.email)}</td>
                  <td className="py-4 pr-4 text-white/80">{safeString(u.name) || '—'}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getRoleBadge(targetRole)}`}>
                      {targetRole}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${status === 'BANNED' ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : status === 'SUSPENDED' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-white/10 bg-black/20 text-white/90'
                      }`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={u.emailVerified ? 'text-emerald-400' : 'text-white/50'}>
                      {u.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-xs text-white/50">{u.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {u.emailVerified ? (
                        <span className="inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-semibold border border-green-500/30 bg-green-500/10 text-green-200">
                          ✓ Verified
                        </span>
                      ) : (
                        <button
                          disabled={!canVerifyEmail || isBusy}
                          onClick={() => doAction(u.id, async () => {
                            const ok = window.confirm('Mark this user email as verified?')
                            if (!ok) return
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/verify-email`)
                          })}
                          className={`h-8 rounded-lg px-3 text-[11px] font-semibold ${canVerifyEmail && !isBusy ? 'border border-white/10 bg-transparent text-white/90 hover:bg-white/5' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                        >
                          Verify
                        </button>
                      )}

                      {canRoleChange && (
                        <button
                          onClick={() => openRoleModal(u)}
                          disabled={isBusy}
                          className="h-8 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 text-[11px] font-bold text-amber-300 hover:bg-amber-400/10 transition-all disabled:opacity-50"
                        >
                          Change Role
                        </button>
                      )}

                      <button
                        disabled={!canBan || isBusy}
                        onClick={() => doAction(u.id, async () => {
                          const ok = window.confirm('Ban this user?')
                          if (!ok) return
                          await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/ban`)
                        })}
                        className={`h-8 rounded-lg px-3 text-[11px] font-semibold ${canBan && !isBusy ? 'bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/25' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                      >
                        Ban
                      </button>

                      <button
                        disabled={!canDelete || isBusy}
                        onClick={() => doAction(u.id, async () => {
                          const ok = window.confirm('Delete this user? This is permanent.')
                          if (!ok) return
                          await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/delete`)
                        })}
                        className={`h-8 rounded-lg px-3 text-[11px] font-semibold ${canDelete && !isBusy ? 'border border-red-500/30 bg-transparent text-red-200 hover:bg-red-500/10' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
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
                <td colSpan={7} className="py-16 text-center text-white/40">No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* ─── Role Change Confirmation Modal ─── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRoleModalUser(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1425] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Change Role</h3>
            <p className="text-sm text-white/40 mb-5">Update the role for this user.</p>

            {/* User info */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 uppercase tracking-wider">User</span>
                <span className="text-sm text-white font-semibold truncate max-w-[240px]">{roleModalUser.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40 uppercase tracking-wider">Current Role</span>
                <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase ${getRoleBadge(safeString(roleModalUser.role).toUpperCase())}`}>
                  {safeString(roleModalUser.role).toUpperCase() || 'USER'}
                </span>
              </div>
            </div>

            {/* Role selector */}
            <div className="mb-5">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">New Role</label>
              <div className="grid grid-cols-2 gap-2">
                {getAllowedRoles(safeString(roleModalUser.role).toUpperCase()).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`h-10 rounded-xl border text-[12px] font-bold uppercase tracking-wider transition-all ${selectedRole === r
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-sm shadow-amber-400/10'
                      : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {selectedRole && (
              <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-3 mb-5">
                <div className="flex items-center gap-3 text-sm">
                  <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase ${getRoleBadge(safeString(roleModalUser.role).toUpperCase())}`}>
                    {safeString(roleModalUser.role).toUpperCase() || 'USER'}
                  </span>
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase ${getRoleBadge(selectedRole)}`}>
                    {selectedRole}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRoleModalUser(null)}
                className="h-10 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/60 hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!selectedRole || busyId === roleModalUser.id}
                onClick={confirmRoleChange}
                className={`h-10 rounded-xl px-5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${selectedRole
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:from-amber-300 hover:to-amber-400'
                  : 'bg-white/5 text-white/30'
                  }`}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
