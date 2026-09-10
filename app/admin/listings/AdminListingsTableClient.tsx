'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'
import type { AppRole } from '@/lib/rbac'
import { useAdminAction } from '@/components/admin/AdminActionProvider'

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
  const { runAction } = useAdminAction()
  const [busyId, setBusyId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState('')
  const [error, setError] = useState('')
  const selectAllRef = useRef<HTMLInputElement>(null)

  const capabilities = useMemo(() => getAdminCapabilities(currentRole), [currentRole])

  const groupedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const it of items) {
      const key = safeString(it.status) || '—'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [items])

  const displayedIds = useMemo(() => items.map((item) => item.id), [items])
  const selectedDisplayedCount = displayedIds.filter((id) => selectedIds.has(id)).length
  const allDisplayedSelected = displayedIds.length > 0 && selectedDisplayedCount === displayedIds.length
  const someDisplayedSelected = selectedDisplayedCount > 0 && !allDisplayedSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someDisplayedSelected
  }, [someDisplayedSelected])

  useEffect(() => {
    setSelectedIds((previous) => {
      const next = new Set(Array.from(previous).filter((id) => displayedIds.includes(id)))
      if (next.size === previous.size) return previous
      return next
    })
  }, [displayedIds])

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDisplayedSelection = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (allDisplayedSelected || someDisplayedSelected) displayedIds.forEach((id) => next.delete(id))
      else displayedIds.forEach((id) => next.add(id))
      return next
    })
  }

  const runBulkAction = async (action: 'PUBLISH' | 'REJECT' | 'ARCHIVE' | 'UNPUBLISH' | 'SOLD' | 'RESTORE', reason?: string) => {
    const ids = Array.from(selectedIds)
    if (!ids.length || bulkActionLoading) return
    setBulkActionLoading(action)
    setError('')
    try {
      const response = await fetch('/api/admin/properties/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, reason }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok && !json?.partial) throw new Error(safeString(json?.message) || 'Bulk action failed')
      const failedIds = Array.isArray(json?.failed) ? json.failed.map((item: { id: string }) => item.id) : []
      if (failedIds.length) setError(`${failedIds.length} selected listing${failedIds.length === 1 ? '' : 's'} could not be processed.`)
      setSelectedIds(new Set(failedIds))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk action failed')
    } finally {
      setBulkActionLoading('')
    }
  }

  const confirmBulkAction = async (action: 'REJECT' | 'SOLD' | 'ARCHIVE') => {
    let reason = ''
    const labels = { REJECT: 'reject', SOLD: 'mark sold', ARCHIVE: 'archive' }
    const confirmed = await runAction({
      title: `${labels[action]} ${selectedIds.size} listings?`,
      description: action === 'REJECT' ? 'Provide a reason for the selected listings.' : 'This action will update every selected listing.',
      confirmLabel: labels[action],
      variant: action === 'SOLD' || action === 'ARCHIVE' ? 'danger' : 'default',
      input: action === 'REJECT' ? { label: 'Reason', placeholder: 'Enter at least 3 characters.', required: true, onChange: (value) => { reason = value } } : undefined,
      loadingTitle: 'Processing listings',
      successTitle: 'Listings processed',
      errorMessage: 'Unable to process the selected listings.',
      mutation: async () => {
        if (action === 'REJECT' && reason.trim().length < 3) throw new Error('Rejection reason is required.')
        await runBulkAction(action, reason.trim() || undefined)
      },
    })
    return confirmed
  }

  const permanentlyDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length || bulkActionLoading) return
    const confirmed = await runAction({
      title: `Permanently delete ${ids.length} listings?`,
      description: 'This action cannot be undone and removes associated media, inquiries, and moderation records.',
      confirmLabel: 'Delete permanently',
      variant: 'danger',
      loadingTitle: 'Deleting listings',
      successTitle: 'Listings deleted',
      errorMessage: 'Unable to permanently delete the selected listings.',
      mutation: async () => {
        setBulkActionLoading('PERMANENT_DELETE')
        const results = await Promise.allSettled(ids.map(async (id) => {
          const response = await fetch(`/api/admin/properties/${encodeURIComponent(id)}?permanent=true`, { method: 'DELETE' })
          const json = await response.json().catch(() => null)
          if (!response.ok || !json?.success) throw new Error(safeString(json?.message) || 'Delete failed')
          return id
        }))
        const failedIds = results.flatMap((result, index) => result.status === 'rejected' ? [ids[index]] : [])
        setSelectedIds(new Set(failedIds))
        if (failedIds.length) setError(`${failedIds.length} selected listing${failedIds.length === 1 ? '' : 's'} could not be deleted.`)
        router.refresh()
        setBulkActionLoading('')
      },
    })
    return confirmed
  }

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

  const unpublishListing = (id: string) =>
    doAction(id, async () => {
      await postJson(`/api/admin/properties/${encodeURIComponent(id)}/lifecycle`, { action: 'unpublish' })
    })

  const permanentlyDeleteListing = (item: ListingItem) =>
    doAction(item.id, async () => {
      let confirmation = ''
      const confirmed = await runAction({
        title: 'Permanently delete this listing?',
        description: `This permanently removes "${item.title}" and its media, inquiries, and moderation history. Type DELETE to continue.`,
        confirmLabel: 'Delete permanently',
        variant: 'danger',
        input: { label: 'Type DELETE to confirm', placeholder: 'DELETE', required: true, onChange: (value) => { confirmation = value } },
        loadingTitle: 'Deleting listing',
        successTitle: 'Listing permanently deleted',
        errorMessage: 'Unable to permanently delete this listing.',
        mutation: async () => {
          if (confirmation.trim() !== 'DELETE') throw new Error('Type DELETE exactly to permanently delete this listing.')
          await postJson(`/api/admin/properties/${encodeURIComponent(item.id)}?permanent=true`, undefined)
        },
      })
      if (!confirmed) return
    })

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

      {selectedIds.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <span className="mr-auto text-sm font-semibold text-amber-200">{selectedIds.size} selected</span>
          <button type="button" onClick={() => runBulkAction('PUBLISH')} disabled={Boolean(bulkActionLoading)} className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-[#0b1220] disabled:opacity-50">{bulkActionLoading === 'PUBLISH' ? 'Publishing...' : 'Publish'}</button>
          <button type="button" onClick={() => confirmBulkAction('REJECT')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-50">Reject</button>
          <button type="button" onClick={() => confirmBulkAction('ARCHIVE')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 disabled:opacity-50">Archive</button>
          <button type="button" onClick={() => runBulkAction('UNPUBLISH')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-50">Unpublish</button>
          <button type="button" onClick={() => confirmBulkAction('SOLD')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-purple-400/30 px-3 py-1.5 text-xs font-semibold text-purple-200 disabled:opacity-50">Sold</button>
          <button type="button" onClick={() => runBulkAction('RESTORE')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-sky-400/30 px-3 py-1.5 text-xs font-semibold text-sky-200 disabled:opacity-50">Restore</button>
          <button type="button" onClick={() => confirmBulkAction('ARCHIVE')} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-50">Delete</button>
          <button type="button" onClick={permanentlyDeleteSelected} disabled={Boolean(bulkActionLoading)} className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-100 disabled:opacity-50">Permanent Delete</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} disabled={Boolean(bulkActionLoading)} className="rounded-lg px-3 py-1.5 text-xs text-white/50 disabled:opacity-50">Clear Selection</button>
        </div>
      ) : null}

      <div className="md:hidden space-y-3">
        {items.map((it) => {
          const isBusy = busyId === it.id

          const canApproveByState = it.status === 'PENDING_REVIEW'
          const canRejectByState = it.status === 'PENDING_REVIEW'
          const canArchiveByState = it.status === 'PUBLISHED'
          const canRestoreByState = it.status === 'ARCHIVED'
          const canEditByState = it.status === 'PUBLISHED'
          const canUnpublishByState = it.status === 'PUBLISHED'

          const canApprove = capabilities.listings.approve && canApproveByState
          const canReject = capabilities.listings.reject && canRejectByState
          const canArchive = capabilities.listings.archive && canArchiveByState
          const canRestore = capabilities.listings.restore && canRestoreByState
          const canEdit = capabilities.listings.editSafely && canEditByState
          const canUnpublish = capabilities.listings.archive && canUnpublishByState
          const canDelete = capabilities.listings.archive

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
              ? 'Only published listings can be edited safely.'
              : ''

          const archiveReason = !capabilities.listings.archive
            ? 'You do not have permission to archive listings.'
            : !canArchiveByState
              ? 'Only published listings can be archived.'
              : ''

          const restoreReason = !capabilities.listings.restore
            ? 'You do not have permission to restore listings.'
            : !canRestoreByState
              ? 'Only archived listings can be restored.'
              : ''

          return (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(it.id)}
                    onChange={() => toggleSelected(it.id)}
                    aria-label={`Select ${it.title}`}
                    className="mt-1"
                  />
                  <div>
                  <div className="text-white font-semibold">{it.title}</div>
                  <div className="mt-1 text-xs text-white/70">{it.location}</div>
                  <div className="mt-1 text-xs text-white/60 break-all">Agent: {it.agentName} ({it.agentEmail})</div>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/90">
                  {it.status || '—'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/80">
                <div>
                  <div className="text-white/60">Price</div>
                  <div className="font-semibold text-white/90">{it.priceLabel}</div>
                </div>
                <div>
                  <div className="text-white/60">Created</div>
                  <div className="font-semibold text-white/90">{it.createdAt || '—'}</div>
                </div>
                <div>
                  <div className="text-white/60">Submitted</div>
                  <div className="font-semibold text-white/90">{it.submittedAt || '—'}</div>
                </div>
                <div>
                  <div className="text-white/60">ID</div>
                  <div className="font-semibold text-white/90 break-all">{it.id}</div>
                </div>
              </div>

              {it.rejectionReason ? <div className="mt-2 text-xs text-red-300">Rejected: {it.rejectionReason}</div> : null}
              {it.archivedAt ? <div className="mt-2 text-xs text-amber-200">Archived: {it.archivedAt}</div> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/listings/${encodeURIComponent(it.id)}`}
                  className="inline-flex h-9 items-center rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 text-xs font-semibold text-sky-200 hover:bg-sky-400/20"
                >
                  View property
                </Link>
                <button
                  disabled={!canApprove || isBusy}
                  title={approveReason}
                  onClick={() =>
                    doAction(it.id, async () => {
                      await postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/approve`)
                    })
                  }
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                    canApprove && !isBusy ? 'bg-amber-400 text-[#0b1220] hover:bg-amber-300' : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Publish
                </button>

                <button
                  disabled={!canReject || isBusy}
                  title={rejectReason}
                  onClick={() =>
                    doAction(it.id, async () => {
                      let reason = ''
                      await runAction({
                        title: 'Reject this listing?',
                        description: 'Provide a reason so the agent understands why the listing was rejected.',
                        confirmLabel: 'Reject Listing',
                        variant: 'danger',
                        input: { label: 'Rejection reason', placeholder: 'Enter at least 3 characters.', required: true, onChange: (value) => { reason = value } },
                        loadingTitle: 'Rejecting Listing',
                        successTitle: 'Listing Rejected',
                        errorMessage: 'Unable to reject this listing.',
                        mutation: () => postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/reject`, { reason: reason.trim() }),
                      })
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
                  disabled={!canUnpublish || isBusy}
                  title="Move this published listing back to draft."
                  onClick={() => unpublishListing(it.id)}
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                    canUnpublish && !isBusy ? 'border border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Unpublish
                </button>

                <button
                  disabled={!canDelete || isBusy}
                  title="Permanently delete this listing."
                  onClick={() => permanentlyDeleteListing(it)}
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                    canDelete && !isBusy ? 'border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20' : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Delete permanently
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
            </div>
          )
        })}

        {items.length === 0 ? <div className="py-10 text-center text-white/60">No listings found.</div> : null}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70 border-b border-white/10">
              <th className="py-3 pr-4"><input ref={selectAllRef} type="checkbox" checked={allDisplayedSelected} onChange={toggleDisplayedSelection} aria-label="Select all displayed listings" /></th>
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
              const canArchiveByState = it.status === 'PUBLISHED'
              const canRestoreByState = it.status === 'ARCHIVED'
              const canEditByState = it.status === 'PUBLISHED'
              const canUnpublishByState = it.status === 'PUBLISHED'

              const canApprove = capabilities.listings.approve && canApproveByState
              const canReject = capabilities.listings.reject && canRejectByState
              const canArchive = capabilities.listings.archive && canArchiveByState
              const canRestore = capabilities.listings.restore && canRestoreByState
              const canEdit = capabilities.listings.editSafely && canEditByState
              const canUnpublish = capabilities.listings.archive && canUnpublishByState
              const canDelete = capabilities.listings.archive

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
                  ? 'Only published listings can be edited safely.'
                  : ''

              const archiveReason = !capabilities.listings.archive
                ? 'You do not have permission to archive listings.'
                : !canArchiveByState
                  ? 'Only published listings can be archived.'
                  : ''

              const restoreReason = !capabilities.listings.restore
                ? 'You do not have permission to restore listings.'
                : !canRestoreByState
                  ? 'Only archived listings can be restored.'
                  : ''

              return (
                <tr key={it.id} className={`border-b border-white/5 ${selectedIds.has(it.id) ? 'bg-amber-400/[0.03]' : ''}`}>
                  <td className="py-4 pr-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(it.id)}
                      onChange={() => toggleSelected(it.id)}
                      aria-label={`Select ${it.title}`}
                    />
                  </td>
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
                      <Link
                        href={`/admin/listings/${encodeURIComponent(it.id)}`}
                        className="inline-flex h-9 items-center rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 text-xs font-semibold text-sky-200 hover:bg-sky-400/20"
                      >
                        View property
                      </Link>
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
                        Publish
                      </button>

                      <button
                        disabled={!canReject || isBusy}
                        title={rejectReason}
                        onClick={() =>
                          doAction(it.id, async () => {
                            let reason = ''
                            await runAction({
                              title: 'Reject this listing?',
                              description: 'Provide a reason so the agent understands why the listing was rejected.',
                              confirmLabel: 'Reject Listing',
                              variant: 'danger',
                              input: { label: 'Rejection reason', placeholder: 'Enter at least 3 characters.', required: true, onChange: (value) => { reason = value } },
                              loadingTitle: 'Rejecting Listing',
                              successTitle: 'Listing Rejected',
                              errorMessage: 'Unable to reject this listing.',
                              mutation: () => postJson(`/api/admin/listings/${encodeURIComponent(it.id)}/reject`, { reason: reason.trim() }),
                            })
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
                        disabled={!canUnpublish || isBusy}
                        title="Move this published listing back to draft."
                        onClick={() => unpublishListing(it.id)}
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canUnpublish && !isBusy ? 'border border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20' : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Unpublish
                      </button>

                      <button
                        disabled={!canDelete || isBusy}
                        title="Permanently delete this listing."
                        onClick={() => permanentlyDeleteListing(it)}
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canDelete && !isBusy ? 'border border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20' : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Delete permanently
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
                <td colSpan={9} className="py-10 text-center text-white/60">
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
