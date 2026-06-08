'use client'

export type FilterChip = {
  value: string
  label: string
  count?: number
}

type Props = {
  chips: FilterChip[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
}

export default function AdminFilterChips({ chips, value, onChange, className = '', size = 'md' }: Props) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Filters">
      {chips.map((chip) => {
        const active = value === chip.value
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            className={`rounded-lg font-semibold tracking-wide transition ${pad} ${
              active
                ? 'border border-amber-400/40 bg-amber-400/15 text-amber-200'
                : 'border border-white/[0.10] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/80'
            }`}
          >
            {chip.label}
            {typeof chip.count === 'number' ? (
              <span className={`ml-1.5 tabular-nums ${active ? 'text-amber-100/80' : 'text-white/35'}`}>
                ({chip.count})
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
