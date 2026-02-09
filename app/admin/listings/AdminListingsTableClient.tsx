'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'
import type { AppRole } from '@/lib/rbac'

type ListingItem = {
  id: string
  status: string
  title: string
  agentName: string
  agentEmail: string
  agentId: string
  location: string
  priceLabel: string
  createdAt: string
  submittedAt: string
  rejectionReason: string
  archivedAt: string
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

export default function AdminListingsTableClient({
  items,
  currentRole,
}: {
  items: ListingItem[]
  currentRole: AppRole
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const capabilities = useMemo(() => getAdminCapabilities(currentRole), [currentRole])

  const groupedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const it of items) {
      const key = safeString(it.status) || '—'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [items])

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

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-white/70">
        {Object.entries(groupedCounts).map(([k, v]) => (
          <span key={k} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
            {k}: {v}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70 border-b border-white/10">
              <th className="py-3 pr-4">Title</th>
              <th className="py-3 pr-4">Agent</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3 pr-4">Price</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Submitted</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isBusy = busyId === it.id

              const canApproveByState = it.status === 'PENDING_REVIEW'
              const canRejectByState = it.status === 'PENDING_REVIEW'
              const canArchiveByState = it.status === 'APPROVED'
              const canRestoreByState = it.status === 'ARCHIVED'
              const canEditByState = it.status === 'APPROVED'

              const canApprove = capabilities.listings.approve && canApproveByState
              const canReject = capabilities.listings.reject && canRejectByState
              const canArchive = capabilities.listings.archive && canArchiveByState
              const canRestore = capabilities.listings.restore && canRestoreByState
              const canEdit = capabilities.listings.editSafely && canEditByState

              const approveReason = !capabilities.listings.approve
                ? 'You do not have permission to approve listings.'
                : !canApproveByState
                  ? 'Only pending listings can be approved.'
                  : ''

              const rejectReason = !capabilities.listings.reject
                ? 'You do not have permission to reject listings.'
                : !canRejectByState
                  ? 'Only pending listings can be rejected.'
                  : ''

              const editReason = !capabilities.listings.editSafely
                ? 'You do not have permission to edit listings.'
                : !canEditByState
                  ? 'Only approved listings can be edited safely.'
                  : ''

              const archiveReason = !capabilities.listings.archive
                ? 'You do not have permission to archive listings.'
                : !canArchiveByState
                  ? 'Only approved listings can be archived.'
                  : ''

              const restoreReason = !capabilities.listings.restore
                ? 'You do not have permission to restore listings.'
                : !canRestoreByState
                  ? 'Only archived listings can be restored.'
                  : ''

              return (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-white">{it.title}</div>
                    {it.rejectionReason ? <div className="mt-1 text-xs text-red-300">Rejected: {it.rejectionReason}</div> : null}
                    {it.archivedAt ? <div className="mt-1 text-xs text-amber-200">Archived: {it.archivedAt}</div> : null}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white">{it.agentName}</div>
                    <div className="text-xs text-white/60">{it.agentEmail}</div>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{it.location}</td>
                  <td className="py-4 pr-4 text-white/80">{it.priceLabel}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {it.status || '—'}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/70">{it.submittedAt || '—'}</td>
                  <td className="py-4 pr-4 text-white/70">{it.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!canApprove || isBusy}
                        title={approveReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/approve`)
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
                        disabled={!canReject || isBusy}
                        title={rejectReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            const reason = window.prompt('Rejection reason (visible to agent):') || ''
                            if (reason.trim().length < 3) throw new Error('Rejection reason is required.')
                            await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/reject`, { reason })
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canReject && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Reject
                      </button>

                      <button
                        disabled={!canEdit || isBusy}
                        title={editReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            const json = await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/edit`)
                            const draftId = safeString(json?.draftId)
                            if (!draftId) throw new Error('Draft creation failed')
                            router.push(`/properties/new/manual?mode=edit&draftId=${encodeURIComponent(draftId)}`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canEdit && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Edit safely
                      </button>

                      <button
                        disabled={!canArchive || isBusy}
                        title={archiveReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/archive`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canArchive && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Archive
                      </button>

                      <button
                        disabled={!canRestore || isBusy}
                        title={restoreReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/restore`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canRestore && !isBusy
                            ? 'bg-white text-[#0b1220] hover:bg-white/90'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-white/60">
                  No listings found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
