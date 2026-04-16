'use client'

import type { VerixShieldStatusType } from '@/lib/verixshield/types'

interface ValuationCardProps {
  valuation: {
    min: number
    max: number
    median: number
    confidence: number
    confidenceReasons: string[]
  }
  askingPrice: number | null
  deviation: number
  status: VerixShieldStatusType
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function ValuationCard({ valuation, askingPrice, deviation, status }: ValuationCardProps) {
  const deviationColor = Math.abs(deviation) <= 10
    ? 'text-emerald-400'
    : deviation > 0
      ? 'text-orange-400'
      : 'text-blue-400'

  const deviationBg = Math.abs(deviation) <= 10
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : deviation > 0
      ? 'bg-orange-500/10 border-orange-500/20'
      : 'bg-blue-500/10 border-blue-500/20'

  return (
    <div className="space-y-3">
      {/* Confidence bar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>Confidence Score</span>
            <span className="font-mono font-medium text-white/60">{valuation.confidence}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${valuation.confidence}%`,
                background: valuation.confidence >= 70
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : valuation.confidence >= 40
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
        </div>

        {/* Info tooltip */}
        <div className="relative group">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.05] text-white/30 text-[10px] cursor-help hover:bg-white/[0.08] transition-colors">
            ?
          </div>
          <div className="absolute right-0 top-7 w-56 p-3 bg-[#0d1f38] border border-white/[0.08] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            <p className="text-[10px] text-white/50 font-medium mb-2">How confidence is calculated:</p>
            <ul className="space-y-1">
              {valuation.confidenceReasons.map((reason, i) => (
                <li key={i} className="text-[10px] text-white/35 flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Three-column valuation metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Min */}
        <div className="relative p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-colors">
          <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1">Low Estimate</div>
          <div className="text-sm font-semibold text-white/80 font-mono">
            AED {formatPrice(valuation.min)}
          </div>
          <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-blue-400/40" />
        </div>

        {/* Median — highlighted */}
        <div className="relative p-3 rounded-xl bg-gradient-to-b from-blue-500/[0.08] to-cyan-500/[0.04] border border-blue-400/10">
          <div className="text-[10px] text-blue-300/60 uppercase tracking-wider font-medium mb-1">Fair Value</div>
          <div className="text-sm font-bold text-white font-mono">
            AED {formatPrice(valuation.median)}
          </div>
          <div className="absolute top-2 right-2">
            <svg className="w-3 h-3 text-blue-400/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        </div>

        {/* Max */}
        <div className="relative p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-colors">
          <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-1">High Estimate</div>
          <div className="text-sm font-semibold text-white/80 font-mono">
            AED {formatPrice(valuation.max)}
          </div>
          <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-orange-400/40" />
        </div>
      </div>

      {/* Deviation indicator */}
      {askingPrice !== null && askingPrice > 0 && (
        <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${deviationBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Asking Price:</span>
            <span className="text-sm font-semibold text-white/90 font-mono">
              AED {formatPrice(askingPrice)}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${deviationColor}`}>
            {deviation > 0 ? '↑' : deviation < 0 ? '↓' : '→'}
            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}
