'use client'

import { useMemo, useState } from 'react'
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
}: {
  items: DraftItem[]
  currentRole: AppRole
}) {
  const router = useRouter()
  const { runAction } = useAdminAction()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const capabilities = useMemo(() => getAdminCapabilities(currentRole), [currentRole])

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

      <div className="md:hidden space-y-3">
        {items.map((it) => {
          const isBusy = busyId === it.id
          const canDelete = capabilities.drafts.delete
          const deleteReason = canDelete ? '' : 'You do not have permission to delete drafts.'

          return (
            <div key={it.id} className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex gap-3">
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
                <td colSpan={6} className="py-10 text-center text-white/60">
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
