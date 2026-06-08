'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminCapabilities } from '@/lib/adminCapabilities'

type Row = {
  id: string
  category: string
  stage: string
  logoUrl: string
  certificateUrl: string
  companyDetails: any
  contactInfo: any
  createdAt: string
  updatedAt: string
  utm: { source: string; medium: string; campaign: string }
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

export default function AdminEcosystemPartnersTableClient({
  items,
  currentRole,
}: {
  items: Row[]
  currentRole: unknown
}) {
  const router = useRouter()
  const caps = useMemo(() => getAdminCapabilities(currentRole), [currentRole])

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

  const canModerate = Boolean(caps?.listings?.approve) || Boolean(caps?.agents?.approve)

  return (
    <div>
      {error ? <p className="mb-4 text-sm font-semibold text-red-300">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-white/70 border-b border-white/10">
              <th className="py-3 pr-4">ID</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Stage</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">Contact</th>
              <th className="py-3 pr-4">UTM</th>
              <th className="py-3 pr-4">Created</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const isBusy = busyId === it.id
              const stage = safeString(it.stage).toUpperCase() || 'APPLIED'

              const companyName = safeString(it.companyDetails?.legalCompanyName) || safeString(it.companyDetails?.fullLegalName) || safeString(it.companyDetails?.businessName) || safeString(it.companyDetails?.legalBusinessName) || '—'
              const email = safeString(it.contactInfo?.email) || '—'
              const phone = safeString(it.contactInfo?.phone) || '—'

              const canMoveToReview = canModerate && stage === 'APPLIED'
              const canApprove = canModerate && stage === 'UNDER_REVIEW'
              const canOnboard = canModerate && stage === 'APPROVED'

              return (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="py-4 pr-4 text-white/80">{it.id}</td>
                  <td className="py-4 pr-4 text-white/80">{it.category}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {stage}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{companyName}</td>
                  <td className="py-4 pr-4">
                    <div className="text-white/80">{email}</div>
                    <div className="text-xs text-white/60">{phone}</div>
                  </td>
                  <td className="py-4 pr-4 text-xs text-white/60">
                    {it.utm.source || '—'} / {it.utm.medium || '—'} / {it.utm.campaign || '—'}
                  </td>
                  <td className="py-4 pr-4 text-white/70">{it.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={!canMoveToReview || isBusy}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/ecosystem-partners/${encodeURIComponent(it.id)}/stage`, {
                              stage: 'UNDER_REVIEW',
                            })
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canMoveToReview && !isBusy
                            ? 'bg-amber-400 text-[#0b1220] hover:bg-amber-300'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Under Review
                      </button>

                      <button
                        disabled={!canApprove || isBusy}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/ecosystem-partners/${encodeURIComponent(it.id)}/stage`, {
                              stage: 'APPROVED',
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
                        disabled={!canOnboard || isBusy}
                        onClick={() =>
                          doAction(it.id, async () => {
                            await postJson(`/api/admin/ecosystem-partners/${encodeURIComponent(it.id)}/stage`, {
                              stage: 'ONBOARDED',
                            })
                          })
                        }
                        className={`h-9 rounded-lg px-3 text-xs font-semibold ${
                          canOnboard && !isBusy
                            ? 'border border-white/10 bg-transparent text-white hover:bg-white/5'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        Onboard
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-white/60">
                  No applications found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
