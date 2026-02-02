'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Checklist = {
  hasCover: boolean
  hasCoords: boolean
  hasPrice: boolean
  hasDescription: boolean
  amenityCount: number
}

export default function ModerationPanelClient({
  listingId,
  status,
  agentName,
  agentCompany,
  agentEmail,
  agentPhone,
  agentWhatsapp,
  agentId,
  checklist,
}: {
  listingId: string
  status: string
  agentName: string
  agentCompany: string
  agentEmail: string
  agentPhone: string
  agentWhatsapp: string
  agentId: string
  checklist: Checklist
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const canApprove = useMemo(() => {
    return (
      status === 'PENDING_REVIEW' &&
      checklist.hasCover &&
      checklist.hasCoords &&
      checklist.hasPrice &&
      checklist.hasDescription
    )
  }, [status, checklist])

  const approve = async () => {
    if (!canApprove || loading) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/moderation/properties/${encodeURIComponent(listingId)}/approve`, {
        method: 'POST',
      })
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to approve')
      setSuccess('Approved. Listing is now live.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const reject = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/moderation/properties/${encodeURIComponent(listingId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to reject')
      setSuccess('Rejected. Reason is now visible to the agent.')
      setRejectReason('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject')
    } finally {
      setLoading(false)
    }
  }

  const whatsAppHref = agentWhatsapp ? `https://wa.me/${agentWhatsapp.replace(/[^0-9]/g, '')}` : ''

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-7">
      <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Moderation Panel</p>
      <p className="mt-2 text-sm text-gray-600">Status: {status}</p>

      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-semibold text-green-700">{success}</p> : null}

      <div className="mt-6 rounded-2xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-dark-blue">Agent info</p>
        <p className="mt-2 text-sm text-gray-700">{agentName}</p>
        <p className="text-sm text-gray-600">{agentCompany || '—'}</p>
        <div className="mt-4 space-y-2">
          {agentPhone ? (
            <a href={`tel:${agentPhone}`} className="text-sm font-semibold text-dark-blue hover:underline">
              Call: {agentPhone}
            </a>
          ) : null}
          {whatsAppHref ? (
            <a href={whatsAppHref} target="_blank" rel="noreferrer" className="text-sm font-semibold text-dark-blue hover:underline">
              WhatsApp
            </a>
          ) : null}
          {agentEmail ? (
            <a href={`mailto:${agentEmail}`} className="text-sm font-semibold text-dark-blue hover:underline">
              Email: {agentEmail}
            </a>
          ) : null}
          {agentId ? (
            <Link href={`/agents/${encodeURIComponent(agentId)}`} className="text-sm font-semibold text-dark-blue hover:underline">
              Agent profile
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-dark-blue">Validation checklist</p>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <p>Has cover image: {checklist.hasCover ? 'Yes' : 'No'}</p>
          <p>Has coordinates: {checklist.hasCoords ? 'Yes' : 'No'}</p>
          <p>Has price: {checklist.hasPrice ? 'Yes' : 'No'}</p>
          <p>Has description: {checklist.hasDescription ? 'Yes' : 'No'}</p>
          <p>Amenity count: {String(checklist.amenityCount)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-dark-blue">Admin actions</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <button
            onClick={approve}
            disabled={!canApprove || loading}
            className={`h-11 rounded-xl font-semibold ${
              canApprove && !loading
                ? 'bg-dark-blue text-white hover:bg-dark-blue/90'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Approve
          </button>

          <div className="rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-dark-blue">Reject (requires reason)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
              placeholder="Write a clear reason the agent will see..."
            />
            <button
              onClick={reject}
              disabled={loading || rejectReason.trim().length < 3 || status !== 'PENDING_REVIEW'}
              className={`mt-3 h-11 w-full rounded-xl font-semibold ${
                !loading && rejectReason.trim().length >= 3 && status === 'PENDING_REVIEW'
                  ? 'border border-gray-200 bg-white text-dark-blue hover:bg-gray-50'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Reject
            </button>
          </div>
        </div>

        {!canApprove && status === 'PENDING_REVIEW' ? (
          <p className="mt-4 text-xs text-gray-600">
            Approvals are blocked until required fields are present.
          </p>
        ) : null}
      </div>
    </div>
  )
}
