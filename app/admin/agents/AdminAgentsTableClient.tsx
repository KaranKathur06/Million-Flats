'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAdminCapabilities } from '@/lib/adminCapabilities'

type AgentRow = {
  userId: string
  agentId: string
  name: string
  email: string
  phone: string
  verified: boolean
  role: string
  status: string
  createdAt: string
  company: string
  license: string
  whatsapp: string
  approved: boolean
  profileStatus: string
  profileCompletion: number
  verificationStatus: string
  riskScore: number
  totalDocs: number
  approvedDocs: number
  completionPercentage: number
  subscriptionPlan: string
  subscriptionStatus: string
  subscriptionEndDate: string | null
  subscriptionDaysRemaining: number | null
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function getRiskBadge(score: number) {
  if (score >= 70) return { label: 'HIGH', cls: 'border-red-500/30 bg-red-500/10 text-red-300' }
  if (score >= 30) return { label: 'MEDIUM', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' }
  return { label: 'LOW', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' }
}

function getStatusBadge(status: string) {
  const s = status.toUpperCase()
  switch (s) {
    case 'APPROVED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'REJECTED':
      return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'UNDER_REVIEW':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    case 'SUBMITTED':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    case 'FLAGGED':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-300'
    default:
      return 'border-white/10 bg-black/20 text-white/70'
  }
}

async function postJson(url: string) {
  const res = await fetch(url, { method: 'POST' })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.success) {
    throw new Error(safeString(json?.message) || 'Request failed')
  }
  return json
}

export default function AdminAgentsTableClient({
  items,
  currentRole,
}: {
  items: AgentRow[]
  currentRole: unknown
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const caps = getAdminCapabilities(currentRole)
  const role = safeString(currentRole).toUpperCase()
  const isSuperadmin = role === 'SUPERADMIN'

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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((it) => {
          const isBusy = busyId === it.agentId
          const vs = it.verificationStatus.toUpperCase() || 'PENDING'
          const risk = getRiskBadge(it.riskScore)

          return (
            <div key={it.agentId || it.userId} className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">{it.name}</div>
                  <div className="text-xs text-white/70 break-all">{it.email}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getStatusBadge(vs)}`}>
                    {vs.replace('_', ' ')}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${risk.cls}`}>
                    {risk.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/80">
                <div>
                  <div className="text-white/50">Company</div>
                  <div className="font-semibold text-white/90 truncate">{it.company || '—'}</div>
                </div>
                <div>
                  <div className="text-white/50">Documents</div>
                  <div className="font-semibold text-white/90">{it.approvedDocs}/{it.totalDocs}</div>
                </div>
                <div>
                  <div className="text-white/50">Progress</div>
                  <div className="font-semibold text-white/90">{it.completionPercentage}%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, it.completionPercentage)}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {it.agentId && (
                  <Link
                    href={`/admin/agents/${it.agentId}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400/90 to-amber-500/90 px-4 text-xs font-bold text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Review
                  </Link>
                )}
              </div>
            </div>
          )
        })}
        {items.length === 0 ? <div className="py-10 text-center text-white/60">No agents found.</div> : null}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-white/40 border-b border-white/[0.08]">
              <th className="py-3 pr-4">Agent</th>
              <th className="py-3 pr-4">Company</th>
              <th className="py-3 pr-4">Documents</th>
              <th className="py-3 pr-4">Progress</th>
              <th className="py-3 pr-4">Risk</th>
              <th className="py-3 pr-4">Verification</th>
              <th className="py-3 pr-4">Plan</th>
              <th className="py-3 pr-4">Subscription</th>
              <th className="py-3 pr-4">Days Left</th>
              <th className="py-3 pr-4">Submitted</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const vs = it.verificationStatus.toUpperCase() || 'PENDING'
              const risk = getRiskBadge(it.riskScore)

              return (
                <tr key={it.agentId || it.userId} className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-white">{it.name}</div>
                    <div className="text-xs text-white/50 mt-0.5">{it.email}</div>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{it.company || '—'}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white/90 font-semibold">{it.approvedDocs}</span>
                      <span className="text-white/30">/</span>
                      <span className="text-white/60">{it.totalDocs}</span>
                      <span className="text-[10px] text-white/40">docs</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, it.completionPercentage)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/60 font-medium">{it.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${risk.cls}`}>
                      {risk.label}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getStatusBadge(vs)}`}>
                      {vs.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    {it.subscriptionPlan ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-white/80">
                        {it.subscriptionPlan}
                      </span>
                    ) : (
                      <span className="text-xs text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {it.subscriptionStatus ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                          it.subscriptionStatus === 'ACTIVE' || it.subscriptionStatus === 'TRIAL'
                            ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400'
                            : it.subscriptionStatus === 'EXPIRED'
                            ? 'bg-red-500/10 border-red-400/20 text-red-400'
                            : 'bg-gray-500/10 border-gray-400/20 text-gray-400'
                        }`}
                      >
                        {it.subscriptionStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {it.subscriptionDaysRemaining !== null ? (
                      <span
                        className={`text-xs font-semibold ${
                          it.subscriptionDaysRemaining === 0
                            ? 'text-red-400'
                            : it.subscriptionDaysRemaining <= 7
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {it.subscriptionDaysRemaining}
                      </span>
                    ) : (
                      <span className="text-xs text-white/40">—</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-xs text-white/50">{it.createdAt || '—'}</td>
                  <td className="py-4 pr-4">
                    {it.agentId && (
                      <Link
                        href={`/admin/agents/${it.agentId}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400/90 to-amber-500/90 px-4 text-[11px] font-bold text-[#0b1220] shadow-sm shadow-amber-500/20 hover:shadow-md hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}

            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="text-white/30">
                    <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">No agents in this queue</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
