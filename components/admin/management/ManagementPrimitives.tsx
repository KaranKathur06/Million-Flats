'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

export type ManagementMetric = {
  key: string
  label: string
  value: number
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

const metricTone: Record<NonNullable<ManagementMetric['tone']>, string> = {
  default: 'text-white/80',
  success: 'text-emerald-400',
  warning: 'text-amber-300',
  danger: 'text-red-400',
}

export function ManagementMetricCards({ metrics }: { metrics: ManagementMetric[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className={`text-xl font-bold ${metricTone[metric.tone || 'default']}`}>{metric.value}</p>
          <p className="mt-0.5 text-[11px] text-white/30">{metric.label}</p>
        </div>
      ))}
    </div>
  )
}

export function LifecycleTabs({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            value === option ? 'bg-white/[0.10] text-white/90' : 'text-white/35 hover:text-white/60'
          }`}
        >
          {option.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

export function CountryFilter({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option === 'ALL COUNTRIES' ? '' : option)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            (option === 'ALL COUNTRIES' ? '' : option) === value
              ? 'bg-white/[0.10] text-white/90'
              : 'text-white/35 hover:text-white/60'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function LifecycleBadge({ status, deleted = false }: { status?: string | null; deleted?: boolean }) {
  const label = deleted ? 'DELETED' : String(status || 'UNKNOWN').replace(/_/g, ' ')
  const tone = deleted
    ? 'bg-red-500/15 text-red-300'
    : status === 'APPROVED' || status === 'ACTIVE'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'REJECTED' || status === 'SUSPENDED'
        ? 'bg-red-500/15 text-red-300'
        : 'bg-amber-500/15 text-amber-300'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>
}

export function EntityIdentityCell({
  name,
  identifier,
  mediaUrl,
  fallbackLabel,
}: {
  name: string
  identifier?: string | null
  mediaUrl?: string | null
  fallbackLabel: string
}) {
  const [mediaFailed, setMediaFailed] = useState(false)

  return (
    <div className="flex min-w-0 items-center gap-3">
      {mediaUrl && !mediaFailed ? (
        <img
          src={mediaUrl}
          alt={name}
          className="h-9 w-9 shrink-0 rounded-lg border border-white/10 bg-white p-0.5 object-contain"
          onError={() => setMediaFailed(true)}
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-white/40">
          {fallbackLabel.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-white/90">{name}</p>
        <p className="truncate font-mono text-[11px] text-white/30">{identifier || '-'}</p>
      </div>
    </div>
  )
}

export function ManagementEmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/30">--</div>
      <p className="text-sm font-medium text-white/75">{title}</p>
      <p className="mt-1 text-xs text-white/35">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
