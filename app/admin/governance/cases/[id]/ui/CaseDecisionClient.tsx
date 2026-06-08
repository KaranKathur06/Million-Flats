'use client'

import { useMemo, useState } from 'react'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json }
}

export default function CaseDecisionClient(props: { caseId: string; status: string; entityType: string }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isClosed = useMemo(() => safeString(props.status).toUpperCase() === 'CLOSED', [props.status])

  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
      <div className="text-sm text-white/60">Case is {isClosed ? 'CLOSED' : 'OPEN'}</div>

      <div className="mt-4">
        <label className="text-sm font-semibold text-white/80">Note / Reason</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm text-white placeholder:text-white/30"
          placeholder="Required for Reject and Request Info"
        />
      </div>

      {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="mt-3 text-sm text-emerald-300">{success}</div> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setBusy(true)
            try {
              const r = await postJson(`/api/admin/moderation/cases/${props.caseId}/approve`)
              if (!r.ok) return setError(safeString(r.json?.message) || 'Failed')
              setSuccess('Approved')
              window.location.reload()
            } finally {
              setBusy(false)
            }
          }}
          className="h-10 px-4 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300"
        >
          Approve
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setBusy(true)
            try {
              const reason = safeString(note)
              const r = await postJson(`/api/admin/moderation/cases/${props.caseId}/reject`, { reason })
              if (!r.ok) return setError(safeString(r.json?.message) || 'Failed')
              setSuccess('Rejected')
              window.location.reload()
            } finally {
              setBusy(false)
            }
          }}
          className="h-10 px-4 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setBusy(true)
            try {
              const r = await postJson(`/api/admin/moderation/cases/${props.caseId}/flag`, { note: safeString(note) || undefined })
              if (!r.ok) return setError(safeString(r.json?.message) || 'Failed')
              setSuccess('Flagged')
              window.location.reload()
            } finally {
              setBusy(false)
            }
          }}
          className="h-10 px-4 rounded-xl border border-amber-300/30 text-amber-200 bg-transparent font-semibold hover:bg-white/5"
        >
          Flag
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setBusy(true)
            try {
              const r = await postJson(`/api/admin/moderation/cases/${props.caseId}/escalate`, { note: safeString(note) || undefined })
              if (!r.ok) return setError(safeString(r.json?.message) || 'Failed')
              setSuccess('Escalated')
              window.location.reload()
            } finally {
              setBusy(false)
            }
          }}
          className="h-10 px-4 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
        >
          Escalate
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setError(null)
            setSuccess(null)
            setBusy(true)
            try {
              const noteText = safeString(note)
              const r = await postJson(`/api/admin/moderation/cases/${props.caseId}/request-info`, { note: noteText })
              if (!r.ok) return setError(safeString(r.json?.message) || 'Failed')
              setSuccess('Request sent')
              window.location.reload()
            } finally {
              setBusy(false)
            }
          }}
          className="h-10 px-4 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
        >
          Request Info
        </button>
      </div>
    </div>
  )
}
