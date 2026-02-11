'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'

type AgentRow = {
  userId: string
  agentId: string
  name: string
  email: string
  phone: string
  verified: boolean
  role: string
  status: string
  createdAt: string
  company: string
  license: string
  whatsapp: string
  approved: boolean
  profileStatus: string
  profileCompletion: number
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

async function postJson(url: string) {
  const res = await fetch(url, { method: 'POST' })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.success) {
    throw new Error(safeString(json?.message) || 'Request failed')
  }
  return json
}

export default function AdminAgentsTableClient({
  items,
  currentRole,
}: {
  items: AgentRow[]
  currentRole: unknown
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const caps = getAdminCapabilities(currentRole)
  const role = safeString(currentRole).toUpperCase()
  const isSuperadmin = role === 'SUPERADMIN'

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
              <th className="py-3 pr-4">Agent</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">License</th>
              <th className="py-3 pr-4">Profile</th>
              <th className="py-3 pr-4">Completion</th>
              <th className="py-3 pr-4">Approved</th>
              <th className="py-3 pr-4">Account</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isBusy = busyId === it.agentId
              const profileStatus = safeString(it.profileStatus || 'DRAFT').toUpperCase() || 'DRAFT'
              const canApprove =
                caps.agents.approve &&
                it.agentId &&
                (profileStatus === 'SUBMITTED' || (isSuperadmin && profileStatus === 'DRAFT'))
              const canGoLive = caps.agents.approve && it.agentId && it.approved && profileStatus === 'VERIFIED'
              const canSuspend = caps.agents.suspend && it.agentId && profileStatus === 'LIVE'
              const canUnsuspend = caps.agents.suspend && it.agentId && profileStatus === 'SUSPENDED'
              const status = safeString(it.status || 'ACTIVE').toUpperCase() || 'ACTIVE'
              const canBan = caps.agents.ban && Boolean(it.agentId) && status !== 'BANNED'
              const canRevokeRole = caps.agents.revokeRole && Boolean(it.agentId)

              const approveTitle = !caps.agents.approve
                ? 'Forbidden'
                : !isSuperadmin && profileStatus !== 'SUBMITTED'
                  ? 'Agent must submit profile before approval.'
                  : ''
              const suspendTitle = caps.agents.suspend ? '' : 'Forbidden'
              const banTitle = caps.agents.ban ? '' : 'Forbidden'
              const revokeTitle = caps.agents.revokeRole ? '' : 'Forbidden'

              return (
                <tr key={it.agentId || it.userId} className="border-b border-white/5">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-white">{it.name}</div>
                    <div className="text-xs text-white/60">{it.email}</div>
                    {it.phone ? <div className="text-xs text-white/60">{it.phone}</div> : null}
                    <div className="text-xs text-white/60">Verified: {it.verified ? 'Yes' : 'No'}</div>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{it.company || '—'}</td>
                  <td className="py-4 pr-4 text-white/80">{it.license || '—'}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {profileStatus}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{String(it.profileCompletion)}%</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {it.approved ? 'Approved' : 'Pending'}
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
                  <td className="py-4 pr-4 text-white/70">{it.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        title={approveTitle}
                        disabled={!canApprove || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            if (isSuperadmin && profileStatus === 'DRAFT') {
                              const ok = window.confirm(
                                'You are overriding submission requirement. Continue?'
                              )
                              if (!ok) return
                            }
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/approve`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canApprove && !isBusy
                            ? 'bg-amber-400 text-[#0b1220] hover:bg-amber-300'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Approve
                      </button>

                      <button
                        title={approveTitle}
                        disabled={!canGoLive || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            const ok = window.confirm('Go live? This will promote role to AGENT and activate the profile.')
                            if (!ok) return
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/go-live`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canGoLive && !isBusy
                            ? 'bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/25'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Go Live
                      </button>

                      <button
                        title={suspendTitle}
                        disabled={!canSuspend || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            const ok = window.confirm('Suspend this agent?')
                            if (!ok) return
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/suspend`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canSuspend && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Suspend
                      </button>

                      <button
                        title={suspendTitle}
                        disabled={!canUnsuspend || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            const ok = window.confirm('Unsuspend this agent?')
                            if (!ok) return
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/unsuspend`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canUnsuspend && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Unsuspend
                      </button>

                      <button
                        title={banTitle}
                        disabled={!canBan || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            const ok = window.confirm('Ban this agent? This disables login and hides all listings.')
                            if (!ok) return
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/ban`)
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
                        title={revokeTitle}
                        disabled={!canRevokeRole || isBusy}
                        onClick={() =>
                          doAction(it.agentId, async () => {
                            const ok = window.confirm('Revoke AGENT role? This demotes the account to USER and disables agent access.')
                            if (!ok) return
                            await postJson(`/api/admin/agents/${encodeURIComponent(it.agentId)}/revoke-role`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canRevokeRole && !isBusy
                            ? 'border border-white/10 bg-transparent text-white/90 hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Revoke role
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-white/60">
                  No agents found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
