'use client'

import type { RentalIntelligence as RentalIntelligenceType } from '@/lib/verixshield/types'

interface RentalIntelligenceProps {
  rental: RentalIntelligenceType
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

export function RentalIntelligence({ rental }: RentalIntelligenceProps) {
  if (!rental || (rental.estimatedRentalMin <= 0 && rental.estimatedRentalMax <= 0)) {
    return null
  }

  const yieldColor = rental.rentalYield >= 7
    ? 'text-emerald-400'
    : rental.rentalYield >= 5
      ? 'text-amber-400'
      : 'text-orange-400'

  const yieldLabel = rental.rentalYield >= 7
    ? 'Excellent yield'
    : rental.rentalYield >= 5
      ? 'Good yield'
      : 'Moderate yield'

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Rental Intelligence</h3>
        <div className="relative group">
          <span className="text-[10px] text-white/25 cursor-help">ⓘ</span>
          <div className="absolute left-0 top-5 w-48 p-2.5 bg-[#0d1f38] border border-white/[0.08] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            <p className="text-[10px] text-white/40">Estimated monthly rental income and gross rental yield based on property type and location benchmarks.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Monthly Min</div>
          <div className="text-xs font-semibold text-white/70 font-mono">
            {formatPrice(rental.estimatedRentalMin)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Monthly Max</div>
          <div className="text-xs font-semibold text-white/70 font-mono">
            {formatPrice(rental.estimatedRentalMax)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06]">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Gross Yield</div>
          <div className={`text-sm font-bold font-mono ${yieldColor}`}>
            {rental.rentalYield.toFixed(1)}%
          </div>
          <div className="text-[8px] text-white/20 mt-0.5">{yieldLabel}</div>
        </div>
      </div>
    </div>
  )
}
