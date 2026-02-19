'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'

type Row = {
  id: string
  category: string
  categoryTitle?: string
  name: string
  logo: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  status: string
  subscriptionTier: string
  isFeatured: boolean
  isVerified: boolean
  priorityOrder: number
  categoryData: any
  serviceAreas: any
  gstNumber: string
  registrationNumber: string
  createdAt: string
  updatedAt: string
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.success) {
    throw new Error(safeString(json?.message) || 'Request failed')
  }
  return json
}

export default function AdminEcosystemDirectoryTableClient({
  items,
  currentRole,
}: {
  items: Row[]
  currentRole: unknown
}) {
  const router = useRouter()
  const caps = useMemo(() => getAdminCapabilities(currentRole), [currentRole])
  const canModerate = Boolean(caps?.listings?.approve) || Boolean(caps?.agents?.approve)

  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

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
              <th className="py-3 pr-4">ID</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Partner</th>
              <th className="py-3 pr-4">Contact</th>
              <th className="py-3 pr-4">Tier</th>
              <th className="py-3 pr-4">Flags</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isBusy = busyId === it.id
              const status = (it.status || '').toUpperCase() || 'PENDING'

              const canApprove = canModerate && status === 'PENDING'
              const canReject = canModerate && status !== 'REJECTED'
              const canSetApproved = canModerate && status !== 'APPROVED'

              return (
                <>
                  <tr key={it.id} className="border-b border-white/5 align-top">
                    <td className="py-4 pr-4 text-white/80 whitespace-nowrap">{it.id}</td>
                    <td className="py-4 pr-4 text-white/80">
                      <div className="font-semibold">{it.categoryTitle || it.category}</div>
                      <div className="text-xs text-white/60">{it.category}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                        {status}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-white/80">
                      <div className="font-semibold">{it.name}</div>
                      {it.logo ? <div className="text-xs text-white/60 break-all">{it.logo}</div> : null}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-white/80">{it.contactEmail || '—'}</div>
                      <div className="text-xs text-white/60">{it.contactPhone || '—'}</div>
                    </td>
                    <td className="py-4 pr-4 text-white/80 whitespace-nowrap">{it.subscriptionTier || 'FREE'}</td>
                    <td className="py-4 pr-4 text-xs text-white/70 whitespace-nowrap">
                      {it.isVerified ? 'Verified' : 'Unverified'} / {it.isFeatured ? 'Featured' : 'Normal'}
                    </td>
                    <td className="py-4 pr-4 text-white/70 whitespace-nowrap">{it.createdAt || '—'}</td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={!canApprove || isBusy}
                          onClick={() =>
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                status: 'APPROVED',
                              })
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canApprove && !isBusy
                              ? 'bg-green-500/20 text-green-200 border border-green-500/30 hover:bg-green-500/25'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          Approve
                        </button>

                        <button
                          disabled={!canReject || isBusy}
                          onClick={() =>
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                status: 'REJECTED',
                              })
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canReject && !isBusy
                              ? 'bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/25'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          Reject
                        </button>

                        <button
                          disabled={!canSetApproved || isBusy}
                          onClick={() =>
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                status: 'PENDING',
                              })
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canSetApproved && !isBusy
                              ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          Set Pending
                        </button>

                        <button
                          disabled={!canModerate || isBusy}
                          onClick={() =>
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                isVerified: !it.isVerified,
                              })
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canModerate && !isBusy
                              ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          {it.isVerified ? 'Unverify' : 'Verify'}
                        </button>

                        <button
                          disabled={!canModerate || isBusy}
                          onClick={() =>
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                isFeatured: !it.isFeatured,
                              })
                            })
                          }
                          className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                            canModerate && !isBusy
                              ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                              : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          {it.isFeatured ? 'Unfeature' : 'Feature'}
                        </button>

                        <select
                          defaultValue={it.subscriptionTier || 'FREE'}
                          disabled={!canModerate || isBusy}
                          onChange={(e) => {
                            const val = e.target.value
                            doAction(it.id, async () => {
                              await postJson(`/api/admin/ecosystem-directory/${encodeURIComponent(it.id)}/update`, {
                                subscriptionTier: val,
                              })
                            })
                          }}
                          className="h-9 rounded-lg border border-white/10 bg-[#0b1220] px-2 text-xs text-white"
                        >
                          <option value="FREE">FREE</option>
                          <option value="BOOSTED">BOOSTED</option>
                          <option value="PREMIUM">PREMIUM</option>
                          <option value="SPONSORED">SPONSORED</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                          className="h-9 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-white hover:bg-white/5"
                        >
                          {expanded === it.id ? 'Hide JSON' : 'View JSON'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expanded === it.id ? (
                    <tr className="border-b border-white/5">
                      <td colSpan={9} className="py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-semibold text-white/70">Category Data</div>
                            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/10 p-3">
                              {JSON.stringify(it.categoryData ?? null, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white/70">Operational</div>
                            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/10 p-3">
                              {JSON.stringify(
                                {
                                  serviceAreas: it.serviceAreas ?? null,
                                  gstNumber: it.gstNumber || null,
                                  registrationNumber: it.registrationNumber || null,
                                  priorityOrder: it.priorityOrder,
                                  updatedAt: it.updatedAt,
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-white/60">
                  No partners found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
