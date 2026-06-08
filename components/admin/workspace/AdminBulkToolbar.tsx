'use client'

import type { ReactNode } from 'react'

type Action = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger'
}

type Props = {
  selectedCount: number
  entityLabel?: string
  actions: Action[]
  onClear?: () => void
  extra?: ReactNode
}

const variantClass: Record<NonNullable<Action['variant']>, string> = {
  default:
    'border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-50',
  primary:
    'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50',
  danger:
    'border border-red-500/30 bg-red-500/15 text-red-200 hover:bg-red-500/25 disabled:opacity-50',
}

export default function AdminBulkToolbar({
  selectedCount,
  entityLabel = 'item',
  actions,
  onClear,
  extra,
}: Props) {
  if (selectedCount <= 0) return null

  return (
    <div className="sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-[rgba(7,18,34,0.92)] px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-[16px]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-400/20 px-2 text-sm font-bold tabular-nums text-amber-200">
          {selectedCount}
        </span>
        <p className="text-sm font-semibold text-amber-100">
          {selectedCount} {entityLabel}
          {selectedCount === 1 ? '' : 's'} selected
        </p>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-white/45 hover:text-white/70"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${variantClass[action.variant || 'default']}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
