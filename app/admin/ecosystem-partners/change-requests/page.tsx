'use client'

import { useCallback, useEffect, useState } from 'react'

type ChangeRequest = {
  id: string
  requestedChanges: Record<string, unknown>
  createdAt: string
  partner: { id: string; name: string; category: { title: string } }
  submittedBy: { name: string | null; email: string }
}

export default function EcosystemChangeRequestsPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/admin/ecosystem-partners/change-requests', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load pending changes.')
      setRequests(payload.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load pending changes.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const review = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusy(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/ecosystem-partners/change-requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reasons[id] || '' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to review this request.')
      setRequests((current) => current.filter((request) => request.id !== id))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to review this request.')
    } finally {
      setBusy('')
    }
  }

  return (
    <main className="space-y-6 p-6 text-white">
      <header><h1 className="text-2xl font-bold">Partner profile review</h1><p className="mt-1 text-sm text-white/60">Approve or reject sensitive partner edits. Rejections require a reason.</p></header>
      {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {!requests.length ? <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">No pending profile changes.</p> : null}
      {requests.map((request) => {
        const changes = Object.fromEntries(Object.entries(request.requestedChanges).filter(([key]) => !key.endsWith('StorageKey') && !key.endsWith('FileSize')))
        return (
          <article key={request.id} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <header><h2 className="text-lg font-semibold">{request.partner.name} <span className="text-sm font-normal text-white/60">· {request.partner.category.title}</span></h2><p className="text-xs text-white/50">Submitted by {request.submittedBy.name || request.submittedBy.email} · {new Date(request.createdAt).toLocaleString()}</p></header>
            <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(changes).map(([key, value]) => <div key={key} className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><dt className="text-xs uppercase tracking-wide text-white/45">{key}</dt><dd className="mt-1 break-words text-sm">{value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value)}</dd></div>)}</dl>
            <label className="block text-sm">Review reason<textarea value={reasons[request.id] || ''} onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2" /></label>
            <div className="flex gap-2"><button disabled={busy === request.id} onClick={() => void review(request.id, 'APPROVED')} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Approve changes</button><button disabled={busy === request.id || (reasons[request.id] || '').trim().length < 3} onClick={() => void review(request.id, 'REJECTED')} className="rounded-lg border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-50">Reject</button></div>
          </article>
        )
      })}
    </main>
  )
}
