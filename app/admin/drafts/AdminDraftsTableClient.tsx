'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DraftItem = {
  id: string
  title: string
  agentName: string
  agentEmail: string
  location: string
  lastCompletedStep: string
  createdAt: string
  updatedAt: string
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

export default function AdminDraftsTableClient({ items }: { items: DraftItem[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

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

              return (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-white">{it.title}</div>
                    <div className="text-xs text-white/60">{it.id}</div>
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
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          doAction(it.id, async () => {
                            const ok = window.confirm('Delete this draft? This cannot be undone.')
                            if (!ok) return
                            await postJson(`/api/admin/drafts/${encodeURIComponent(it.id)}/delete`)
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          !isBusy ? 'border border-white/10 bg-transparent text-white hover:bg-white/5' : 'bg-white/5 text-white/30'
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
