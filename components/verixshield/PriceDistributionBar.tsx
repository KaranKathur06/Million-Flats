'use client'

import type { PriceDistribution } from '@/lib/verixshield/types'

interface PriceDistributionBarProps {
  distribution: PriceDistribution
  askingPrice: number | null
  valuation: { min: number; max: number; median: number }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function PriceDistributionBar({ distribution, askingPrice, valuation }: PriceDistributionBarProps) {
  const fullMin = distribution.min * 0.95
  const fullMax = distribution.max * 1.05
  const fullRange = fullMax - fullMin || 1

  const getPos = (price: number) => Math.max(0, Math.min(100, ((price - fullMin) / fullRange) * 100))

  const segments = [
    { from: distribution.min, to: distribution.p25, label: 'Low', color: 'bg-blue-500/30', border: 'border-blue-500/20' },
    { from: distribution.p25, to: distribution.median, label: 'Below Avg', color: 'bg-cyan-500/25', border: 'border-cyan-500/15' },
    { from: distribution.median, to: distribution.p75, label: 'Above Avg', color: 'bg-emerald-500/30', border: 'border-emerald-500/20' },
    { from: distribution.p75, to: distribution.max, label: 'High', color: 'bg-orange-500/25', border: 'border-orange-500/15' },
  ]

  const askingPos = askingPrice && askingPrice > 0 ? getPos(askingPrice) : null

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Price Distribution</h3>

      {/* Bar visualization */}
      <div className="relative h-8 flex rounded-lg overflow-hidden mb-2">
        {segments.map((seg, i) => {
          const startPos = getPos(seg.from)
          const endPos = getPos(seg.to)
          const width = Math.max(1, endPos - startPos)

          return (
            <div
              key={i}
              className={`relative ${seg.color} border-r ${seg.border} last:border-r-0 group cursor-default`}
              style={{ width: `${width}%` }}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#0d1f38] border border-white/[0.08] rounded text-[9px] text-white/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {seg.label}: AED {formatCompact(seg.from)} – {formatCompact(seg.to)}
              </div>
            </div>
          )
        })}

        {/* Asking price indicator */}
        {askingPos !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm shadow-white/10 z-10"
            style={{ left: `${askingPos}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border border-white/50" />
          </div>
        )}
      </div>

      {/* Segment labels */}
      <div className="flex justify-between text-[9px] text-white/20">
        <span className="font-mono">AED {formatCompact(distribution.min)}</span>
        <span className="text-white/15">25th</span>
        <span className="text-emerald-400/40 font-medium">Median</span>
        <span className="text-white/15">75th</span>
        <span className="font-mono">AED {formatCompact(distribution.max)}</span>
      </div>
    </div>
  )
}
