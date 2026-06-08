'use client'

import type { VerixShieldStatusType } from '@/lib/verixshield/types'

interface NegotiationInsightProps {
  negotiation: {
    suggestedMin: number
    suggestedMax: number
    strategy: string
  }
  status: VerixShieldStatusType
  deviation: number
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n.toLocaleString()}`
}

export function NegotiationInsight({ negotiation, status, deviation }: NegotiationInsightProps) {
  const iconConfig: Record<string, { icon: string; gradient: string; border: string }> = {
    FAIR: {
      icon: '✅',
      gradient: 'from-emerald-500/[0.06] to-emerald-500/[0.02]',
      border: 'border-emerald-500/10',
    },
    OVERPRICED: {
      icon: '⚠️',
      gradient: 'from-orange-500/[0.06] to-orange-500/[0.02]',
      border: 'border-orange-500/10',
    },
    UNDERPRICED: {
      icon: '💡',
      gradient: 'from-blue-500/[0.06] to-blue-500/[0.02]',
      border: 'border-blue-500/10',
    },
    SUSPICIOUS: {
      icon: '🚨',
      gradient: 'from-red-500/[0.06] to-red-500/[0.02]',
      border: 'border-red-500/10',
    },
    INSUFFICIENT_DATA: {
      icon: '📊',
      gradient: 'from-gray-500/[0.06] to-gray-500/[0.02]',
      border: 'border-gray-500/10',
    },
  }

  const config = iconConfig[status] || iconConfig.INSUFFICIENT_DATA

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${config.gradient} border ${config.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{config.icon}</span>
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Negotiation Insight</h3>
      </div>

      <p className="text-xs text-white/45 leading-relaxed mb-4">
        {negotiation.strategy}
      </p>

      {/* Suggested range */}
      {negotiation.suggestedMin > 0 && negotiation.suggestedMax > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
          <div className="flex-1">
            <div className="text-[10px] text-white/30 mb-0.5">Suggested offer range</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/70 font-mono">
                {formatPrice(negotiation.suggestedMin)}
              </span>
              <span className="text-white/15">—</span>
              <span className="text-xs font-semibold text-white/70 font-mono">
                {formatPrice(negotiation.suggestedMax)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.04]">
            <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-[9px] text-white/15 leading-relaxed">
        This analysis is for informational purposes only. Actual market conditions may differ.
        Always consult with a qualified real estate professional before making decisions.
      </p>
    </div>
  )
}
