'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'
import type { AppRole } from '@/lib/rbac'
import { useAdminAction } from '@/components/admin/AdminActionProvider'

type DraftItem = {
  id: string
  title: string
  agentName: string
  agentEmail: string
  location: string
  lastCompletedStep: string
  createdAt: string
  updatedAt: string
  coverImage: string
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

export default function AdminDraftsTableClient({
  items,
  currentRole,
  totalCount,
}: {
  items: DraftItem[]
  currentRole: AppRole
  totalCount: number
}) {
  const router = useRouter()
  const { runAction } = useAdminAction()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState('')

  const capabilities = useMemo(() => getAdminCapabilities(currentRole), [currentRole])
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id))

  useEffect(() => {
    setSelectedIds((selected) => selected.filter((id) => items.some((item) => item.id === id)))
  }, [items])

  const toggleSelected = (id: string) => {
    setSelectedIds((selected) => selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
  }

  const runBulkAction = async (action: 'PUBLISH' | 'ARCHIVE' | 'PERMANENT_DELETE') => {
    if (!selectedIds.length || bulkActionLoading) return
    if (action === 'PERMANENT_DELETE' && !window.confirm(`Permanently delete ${selectedIds.length} selected draft(s)? This cannot be undone.`)) return

    setBulkActionLoading(action)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/drafts/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const json = await res.json()
      if (!res.ok && !json.partial) throw new Error(json.message || 'Bulk draft action failed')

      const successful = Array.isArray(json.successful) ? json.successful as string[] : []
      const failed = Array.isArray(json.failed) ? json.failed as Array<{ id: string; message: string }> : []
      const pendingCleanup = Array.isArray(json.pendingCleanup) ? json.pendingCleanup as string[] : []
      const label = action === 'PUBLISH' ? 'Published' : action === 'ARCHIVE' ? 'Archived' : 'Permanently deleted'

      setNotice(`${label} ${successful.length} draft(s).${pendingCleanup.length ? ` Media cleanup pending for ${pendingCleanup.length}.` : ''}`)
      setError(failed.length ? `${failed.length} draft(s) could not be processed: ${failed.map((item) => item.message).join('; ')}` : '')
      setSelectedIds(failed.map((item) => item.id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk draft action failed')
    } finally {
      setBulkActionLoading('')
    }
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

  return (
    <div>
      {error ? <p className="mb-4 text-sm font-semibold text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm font-semibold text-emerald-300">{notice}</p> : null}

      {items.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label className="mr-auto inline-flex items-center gap-2 text-xs font-semibold text-white/70">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelectedIds(allSelected ? [] : items.map((item) => item.id))}
              aria-label="Select all visible drafts"
              className="h-4 w-4 accent-amber-400"
            />
            Select visible ({selectedIds.length} selected of {totalCount})
          </label>
          <button type="button" disabled={!selectedIds.length || !!bulkActionLoading || !capabilities.listings.approve} onClick={() => void runBulkAction('PUBLISH')} className="h-9 rounded-lg bg-amber-400 px-3 text-xs font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">
            {bulkActionLoading === 'PUBLISH' ? 'Publishing...' : 'Publish'}
          </button>
          <button type="button" disabled={!selectedIds.length || !!bulkActionLoading || !capabilities.listings.archive} onClick={() => void runBulkAction('ARCHIVE')} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/75 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
            {bulkActionLoading === 'ARCHIVE' ? 'Archiving...' : 'Archive'}
          </button>
          <button type="button" disabled={!selectedIds.length || !!bulkActionLoading || !capabilities.drafts.delete} onClick={() => void runBulkAction('PERMANENT_DELETE')} className="h-9 rounded-lg border border-red-400/30 px-3 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">
            {bulkActionLoading === 'PERMANENT_DELETE' ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      ) : null}

      <div className="md:hidden space-y-3">
        {items.map((it) => {
          const isBusy = busyId === it.id
          const canDelete = capabilities.drafts.delete
          const deleteReason = canDelete ? '' : 'You do not have permission to delete drafts.'

          return (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex gap-3">
                <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelected(it.id)} aria-label={`Select ${it.title}`} className="mt-1 h-4 w-4 shrink-0 accent-amber-400" />
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {it.coverImage ? <img src={it.coverImage} alt={`${it.title} cover`} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-semibold">{it.title}</div>
                  <div className="mt-1 text-xs text-white/60 break-all">{it.id}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/80">
                <div>
                  <div className="text-white/60">Agent</div>
                  <div className="font-semibold text-white/90">{it.agentName}</div>
                  <div className="text-[11px] text-white/60 break-all">{it.agentEmail}</div>
                </div>
                <div>
                  <div className="text-white/60">Location</div>
                  <div className="font-semibold text-white/90">{it.location}</div>
                </div>
                <div>
                  <div className="text-white/60">Last step</div>
                  <div className="font-semibold text-white/90">{it.lastCompletedStep}</div>
                </div>
                <div>
                  <div className="text-white/60">Updated</div>
                  <div className="font-semibold text-white/90">{it.updatedAt || '—'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/properties/${encodeURIComponent(it.id)}/edit`}
                  className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-3 text-xs font-bold text-black hover:bg-amber-300"
                >
                  View details
                </Link>
                <button
                  disabled={isBusy || !canDelete}
                  title={deleteReason}
                  onClick={() => void runAction({
                    title: 'Delete this draft?',
                    description: 'This action cannot be undone and will permanently remove the draft.',
                    confirmLabel: 'Delete Draft',
                    variant: 'danger',
                    loadingTitle: 'Deleting Draft',
                    successTitle: 'Draft Deleted',
                    errorMessage: 'Unable to delete this draft.',
                    mutation: () => {
                      if (!canDelete) return Promise.reject(new Error(deleteReason))
                      return postJson(`/api/admin/drafts/${encodeURIComponent(it.id)}/delete`)
                    },
                    onSuccess: () => router.refresh(),
                  })}
                  className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                    !isBusy && canDelete
                      ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}

        {items.length === 0 ? <div className="py-10 text-center text-white/60">No drafts found.</div> : null}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70 border-b border-white/10">
              <th className="py-3 pr-3">
                <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : items.map((item) => item.id))} aria-label="Select all visible drafts" className="h-4 w-4 accent-amber-400" />
              </th>
              <th className="py-3 pr-4">Title</th>
              <th className="py-3 pr-4">Agent</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3 pr-4">Last step</th>
              <th className="py-3 pr-4">Updated</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isBusy = busyId === it.id
              const canDelete = capabilities.drafts.delete
              const deleteReason = canDelete ? '' : 'You do not have permission to delete drafts.'

              return (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="py-4 pr-3">
                    <input type="checkbox" checked={selectedIds.includes(it.id)} onChange={() => toggleSelected(it.id)} aria-label={`Select ${it.title}`} className="h-4 w-4 accent-amber-400" />
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                        {it.coverImage ? <img src={it.coverImage} alt={`${it.title} cover`} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{it.title}</div>
                        <div className="text-xs text-white/60">{it.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-white">{it.agentName}</div>
                    <div className="text-xs text-white/60">{it.agentEmail}</div>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{it.location}</td>
                  <td className="py-4 pr-4 text-white/80">{it.lastCompletedStep}</td>
                  <td className="py-4 pr-4 text-white/70">{it.updatedAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/properties/${encodeURIComponent(it.id)}/edit`}
                        className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-3 text-xs font-bold text-black hover:bg-amber-300"
                      >
                        View details
                      </Link>
                      <button
                        disabled={isBusy || !canDelete}
                        title={deleteReason}
                        onClick={() => void runAction({
                          title: 'Delete this draft?',
                          description: 'This action cannot be undone and will permanently remove the draft.',
                          confirmLabel: 'Delete Draft',
                          variant: 'danger',
                          loadingTitle: 'Deleting Draft',
                          successTitle: 'Draft Deleted',
                          errorMessage: 'Unable to delete this draft.',
                          mutation: () => {
                            if (!canDelete) return Promise.reject(new Error(deleteReason))
                            return postJson(`/api/admin/drafts/${encodeURIComponent(it.id)}/delete`)
                          },
                          onSuccess: () => router.refresh(),
                        })}
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          !isBusy && canDelete
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
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
                  No drafts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
