'use client'

import type { PriceDistribution } from '@/lib/verixshield/types'

interface PriceGaugeProps {
  valuation: { min: number; max: number; median: number }
  askingPrice: number | null
  pricePosition: number
  distribution: PriceDistribution
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function PriceGauge({ valuation, askingPrice, pricePosition, distribution }: PriceGaugeProps) {
  // Calculate marker positions on the gauge
  const gaugeMin = distribution.min * 0.95
  const gaugeMax = distribution.max * 1.05
  const gaugeRange = gaugeMax - gaugeMin

  const getPosition = (price: number) => {
    if (gaugeRange <= 0) return 50
    return Math.max(2, Math.min(98, ((price - gaugeMin) / gaugeRange) * 100))
  }

  const fairMinPos = getPosition(valuation.min)
  const fairMaxPos = getPosition(valuation.max)
  const medianPos = getPosition(valuation.median)
  const askingPos = askingPrice && askingPrice > 0 ? getPosition(askingPrice) : null

  // Determine zone color based on asking price position
  const getZoneLabel = () => {
    if (!askingPrice || askingPrice <= 0) return { text: 'No asking price', color: 'text-white/40' }
    if (askingPrice < valuation.min * 0.85) return { text: 'Suspiciously Low', color: 'text-red-400' }
    if (askingPrice < valuation.min) return { text: 'Below Market', color: 'text-blue-400' }
    if (askingPrice <= valuation.max) return { text: 'Fair Market Range', color: 'text-emerald-400' }
    if (askingPrice <= valuation.max * 1.15) return { text: 'Above Market', color: 'text-orange-400' }
    return { text: 'Significantly Overpriced', color: 'text-red-400' }
  }

  const zone = getZoneLabel()

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Price Position</h3>
          <div className="relative group">
            <span className="text-[10px] text-white/25 cursor-help">ⓘ</span>
            <div className="absolute left-0 top-5 w-48 p-2.5 bg-[#0d1f38] border border-white/[0.08] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              <p className="text-[10px] text-white/40">Shows where the asking price falls relative to comparable market prices in this area.</p>
            </div>
          </div>
        </div>
        <span className={`text-xs font-medium ${zone.color}`}>{zone.text}</span>
      </div>

      {/* Gauge visualization */}
      <div className="relative h-10 mb-3">
        {/* Track background */}
        <div className="absolute top-4 left-0 right-0 h-2.5 rounded-full overflow-hidden">
          {/* Gradient spectrum: red → yellow → green → yellow → red */}
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 20%, #10b981 35%, #10b981 65%, #f59e0b 80%, #ef4444 100%)',
              opacity: 0.25,
            }}
          />
        </div>

        {/* Fair range highlight */}
        <div
          className="absolute top-4 h-2.5 rounded-full"
          style={{
            left: `${fairMinPos}%`,
            width: `${Math.max(2, fairMaxPos - fairMinPos)}%`,
            background: 'linear-gradient(90deg, rgba(16,185,129,0.35), rgba(52,211,153,0.35))',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        />

        {/* Median marker */}
        <div
          className="absolute top-[11px] w-0.5 h-4 bg-emerald-400/60 rounded-full"
          style={{ left: `${medianPos}%`, transform: 'translateX(-50%)' }}
        />

        {/* Asking price marker */}
        {askingPos !== null && (
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${askingPos}%`, transform: 'translateX(-50%)' }}
          >
            {/* Arrow/marker */}
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-white/30 shadow-lg shadow-white/10" />
              <div className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            {/* Line down to track */}
            <div className="w-px h-3 bg-white/30" />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[10px] text-white/25 font-mono">AED {formatCompact(distribution.min)}</span>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400/50">
            <span className="w-2 h-1 bg-emerald-400/40 rounded-full" />
            Fair Range
          </span>
          <span className="flex items-center gap-1 text-white/40">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-white/30 inline-block" style={{ transform: 'scale(0.6)' }} />
            Your Price
          </span>
        </div>
        <span className="text-[10px] text-white/25 font-mono">AED {formatCompact(distribution.max)}</span>
      </div>

      {/* Percentile position */}
      {askingPrice && askingPrice > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-center gap-2">
          <span className="text-xs text-white/35">Percentile rank:</span>
          <span className="text-xs font-semibold text-white/70 font-mono">{pricePosition}th</span>
          <span className="text-[10px] text-white/25">(out of comparable properties)</span>
        </div>
      )}
    </div>
  )
}
