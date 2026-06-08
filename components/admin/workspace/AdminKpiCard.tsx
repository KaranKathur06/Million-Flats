import Link from 'next/link'

type Props = {
  label: string
  value: number | string
  sublabel?: string
  href?: string
  accent?: 'blue' | 'amber' | 'emerald' | 'orange' | 'violet' | 'slate'
}

const accents: Record<NonNullable<Props['accent']>, { border: string; bg: string; text: string }> = {
  blue: { border: 'border-blue-500/20', bg: 'from-blue-500/20 to-blue-600/5', text: 'text-blue-300' },
  amber: { border: 'border-amber-400/20', bg: 'from-amber-400/20 to-amber-500/5', text: 'text-amber-300' },
  emerald: { border: 'border-emerald-500/20', bg: 'from-emerald-500/20 to-emerald-600/5', text: 'text-emerald-300' },
  orange: { border: 'border-orange-500/25', bg: 'from-orange-500/15 to-amber-500/5', text: 'text-orange-200' },
  violet: { border: 'border-violet-500/20', bg: 'from-violet-500/20 to-violet-600/5', text: 'text-violet-300' },
  slate: { border: 'border-slate-400/15', bg: 'from-slate-400/15 to-slate-500/5', text: 'text-slate-300' },
}

export default function AdminKpiCard({ label, value, sublabel, href, accent = 'blue' }: Props) {
  const a = accents[accent]
  const inner = (
    <div
      className={`rounded-xl border ${a.border} bg-gradient-to-br ${a.bg} px-4 py-3.5 transition-colors hover:border-white/20 ${href ? 'cursor-pointer' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 truncate">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${a.text}`}>{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-white/40">{sublabel}</p> : null}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-xl">
        {inner}
      </Link>
    )
  }
  return inner
}
