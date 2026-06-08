type Point = { label: string; count: number }

type Props = {
  title: string
  points: Point[]
  emptyLabel?: string
  maxBars?: number
}

export default function AdminTrendBars({ title, points, emptyLabel = 'No data yet', maxBars = 7 }: Props) {
  const slice = points.slice(0, maxBars)
  const max = Math.max(1, ...slice.map((p) => p.count))

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-white/40">{title}</h3>
      {slice.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">{emptyLabel}</p>
      ) : (
        <div className="mt-5 flex items-end justify-between gap-2 h-32">
          {slice.map((p) => (
            <div key={p.label} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold tabular-nums text-white/50">{p.count}</span>
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-amber-500/80 to-amber-400/40 transition-all"
                  style={{ height: `${Math.max(8, (p.count / max) * 100)}%` }}
                  title={`${p.label}: ${p.count}`}
                />
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-white/35 truncate w-full text-center">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
