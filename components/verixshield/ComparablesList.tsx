'use client'

import type { ComparableProperty } from '@/lib/verixshield/types'

interface ComparablesListProps {
  comparables: ComparableProperty[]
  stats: {
    count: number
    avgPricePerSqft: number
    medianPrice: number
  }
  askingPrice: number | null
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

export function ComparablesList({ comparables, stats, askingPrice }: ComparablesListProps) {
  if (comparables.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.05] mb-3">
          <span className="text-lg">🏘️</span>
        </div>
        <p className="text-xs text-white/40 mb-1">No comparable properties found</p>
        <p className="text-[10px] text-white/25">We'll update this as more listings are added to this area</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
          <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Comparables</div>
          <div className="text-lg font-bold text-white/90 font-mono">{stats.count}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
          <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Avg/sq ft</div>
          <div className="text-sm font-bold text-white/90 font-mono">AED {stats.avgPricePerSqft.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
          <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Median Price</div>
          <div className="text-sm font-bold text-white/90 font-mono">{formatPrice(stats.medianPrice)}</div>
        </div>
      </div>

      {/* Comparables List */}
      <div className="space-y-2">
        {comparables.map((comp, index) => {
          const priceDiff = askingPrice && askingPrice > 0
            ? ((askingPrice - comp.price) / comp.price) * 100
            : null

          return (
            <div
              key={comp.id}
              className="flex items-stretch gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
            >
              {/* Rank badge */}
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] text-[10px] text-white/30 font-mono font-bold flex-shrink-0 self-start mt-0.5">
                {index + 1}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/70 truncate">
                      {comp.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                      {comp.community && <span>{comp.community}</span>}
                      {comp.distance !== undefined && comp.distance > 0 && (
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {comp.distance.toFixed(1)} km
                        </span>
                      )}
                      <span>{comp.bhk} BHK</span>
                      <span>{comp.sqft.toLocaleString()} sqft</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-white/80 font-mono">
                      {formatPrice(comp.price)}
                    </p>
                    <p className="text-[10px] text-white/25 font-mono mt-0.5">
                      AED {comp.pricePerSqft}/sqft
                    </p>
                  </div>
                </div>

                {/* Bottom row: similarity + price comparison */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                  {/* Similarity bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/25">Similarity</span>
                    <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${comp.similarity}%`,
                          background: comp.similarity >= 70
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : comp.similarity >= 40
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #6b7280, #9ca3af)',
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-white/20 font-mono">{comp.similarity}%</span>
                  </div>

                  {/* Price comparison badge */}
                  {priceDiff !== null && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                      priceDiff > 5
                        ? 'bg-orange-500/10 text-orange-400/70'
                        : priceDiff < -5
                          ? 'bg-emerald-500/10 text-emerald-400/70'
                          : 'bg-white/[0.04] text-white/30'
                    }`}>
                      {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs asking
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
