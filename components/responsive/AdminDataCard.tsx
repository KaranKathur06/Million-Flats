'use client'

import { cn } from '@/lib/utils'

type AdminDataCardProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  status?: React.ReactNode
  leading?: React.ReactNode
  actions?: React.ReactNode
  selected?: boolean
  onSelect?: () => void
  className?: string
}

/** Touch-friendly stacked row for admin CMS on mobile. */
export function AdminDataCard({
  title,
  subtitle,
  meta,
  status,
  leading,
  actions,
  selected,
  onSelect,
  className,
}: AdminDataCardProps) {
  return (
    <article
      className={cn(
        'rounded-2xl border bg-white/[0.02] p-4 transition-colors',
        selected ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-white/[0.06]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {onSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 shrink-0 accent-amber-400"
            aria-label="Select row"
          />
        ) : null}
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-snug text-white/90 break-words">{title}</h3>
              {subtitle ? <p className="mt-0.5 text-xs text-white/45 break-all">{subtitle}</p> : null}
            </div>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {meta ? <div className="mt-3 space-y-1.5 text-xs text-white/55">{meta}</div> : null}
        </div>
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">{actions}</div>
      ) : null}
    </article>
  )
}
