'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatAEDCompact } from '@/lib/pricing'
import { getAiStatusStyles } from './statusStyles'

interface AIShieldCTAProps {
  projectSlug?: string
  projectId?: string
  propertyId?: string
  entityType?: 'PROJECT' | 'MANUAL_PROPERTY'
  className?: string
}

interface Snapshot {
  fairValue: number | null
  confidence: number | null
  statusLabel: string
  hasAnalysis: boolean
}

export function AIShieldCTA({
  projectSlug,
  projectId,
  propertyId,
  entityType = 'PROJECT',
  className = '',
}: AIShieldCTAProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))

  const href =
    projectSlug
      ? `/ai/shield?project=${encodeURIComponent(projectSlug)}`
      : propertyId && entityType === 'MANUAL_PROPERTY'
        ? `/ai/shield?property=${encodeURIComponent(propertyId)}&type=MANUAL_PROPERTY`
        : '/ai/shield'

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }
    fetch(`/api/ai-shield/snapshot?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.snapshot) {
          setSnapshot(json.snapshot)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  const statusStyles = getAiStatusStyles(snapshot?.statusLabel || 'Analysis in Progress')

  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm max-h-[220px] ${className}`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">AIShield™ Verified</p>
              <p className="text-xs text-gray-500">Price Intelligence</p>
            </div>
          </div>
          {snapshot?.statusLabel && !loading && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyles.badge}`}>
              {snapshot.statusLabel}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ) : snapshot?.hasAnalysis ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-3">
            <div>
              <dt className="text-gray-400">Fair Value</dt>
              <dd className="font-bold text-gray-900">
                {snapshot.fairValue ? formatAEDCompact(snapshot.fairValue) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Confidence</dt>
              <dd className="font-bold text-gray-900">
                {snapshot.confidence != null ? `${Math.round(snapshot.confidence)}%` : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <ul className="text-[11px] text-gray-600 space-y-1 mb-3 leading-snug">
            <li className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Fair value estimate
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Market comparables
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-blue-500">✓</span> Investment signals
            </li>
          </ul>
        )}

        <Link
          href={href}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold text-white bg-[#0a1628] rounded-lg hover:bg-[#132d50] transition-colors"
        >
          {snapshot?.hasAnalysis ? 'View Intelligence' : 'Analyze This Project'}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  )
}

export default AIShieldCTA
