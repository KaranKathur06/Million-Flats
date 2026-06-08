'use client'

import type { MarketSignalResult } from '@/lib/verixshield/types'

interface MarketSignalsPanelProps {
  signals: MarketSignalResult
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  if (score >= 30) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreGradient(score: number): string {
  if (score >= 70) return 'from-emerald-500 to-emerald-400'
  if (score >= 50) return 'from-amber-500 to-amber-400'
  if (score >= 30) return 'from-orange-500 to-orange-400'
  return 'from-red-500 to-red-400'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Very High'
  if (score >= 60) return 'High'
  if (score >= 40) return 'Moderate'
  if (score >= 20) return 'Low'
  return 'Very Low'
}

export function MarketSignalsPanel({ signals }: MarketSignalsPanelProps) {
  const metrics = [
    {
      label: 'Demand Score',
      value: signals.demandScore,
      display: `${signals.demandScore.toFixed(0)}/100`,
      description: 'Buyer interest level based on listing views, inquiries, and search activity',
      icon: '🔥',
      isScore: true,
    },
    {
      label: 'Supply Score',
      value: signals.supplyScore,
      display: `${signals.supplyScore.toFixed(0)}/100`,
      description: 'Available inventory relative to demand — lower supply favors sellers',
      icon: '📦',
      isScore: true,
    },
    {
      label: 'Listing Velocity',
      value: signals.listingVelocity,
      display: `${signals.listingVelocity.toFixed(0)}/week`,
      description: 'New listings entering the market each week in this area',
      icon: '⚡',
      isScore: false,
    },
    {
      label: 'Avg Days on Market',
      value: signals.avgDaysOnMarket,
      display: `${signals.avgDaysOnMarket.toFixed(0)} days`,
      description: 'Average time a property stays listed before being sold or removed',
      icon: '⏱️',
      isScore: false,
    },
  ]

  const secondaryMetrics = [
    ...(signals.inventoryMonths != null
      ? [{
          label: 'Inventory Months',
          value: `${signals.inventoryMonths.toFixed(1)} mo`,
          description: 'Time to sell all current inventory at current pace. Under 6 = seller\'s market.',
        }]
      : []),
    ...(signals.priceToRentRatio != null
      ? [{
          label: 'Price-to-Rent Ratio',
          value: `${signals.priceToRentRatio.toFixed(1)}x`,
          description: 'Annual price divided by annual rent. Lower = better for investors.',
        }]
      : []),
  ]

  // Market health indicator
  const healthScore = Math.round(
    (signals.demandScore * 0.35) +
    ((100 - signals.supplyScore) * 0.25) +
    (Math.min(100, signals.listingVelocity * 5) * 0.2) +
    (Math.min(100, Math.max(0, 100 - signals.avgDaysOnMarket)) * 0.2)
  )

  return (
    <div className="space-y-4">
      {/* Market Health Overview */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Market Health</h3>
          <div className={`flex items-center gap-1.5 text-sm font-bold ${getScoreColor(healthScore)}`}>
            {healthScore}
            <span className="text-[10px] font-normal text-white/30">/100</span>
          </div>
        </div>

        {/* Circular gauge */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              {/* Progress arc */}
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="url(#health-gradient)"
                strokeWidth="3"
                strokeDasharray={`${healthScore * 0.975} 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="health-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={healthScore >= 50 ? '#10b981' : '#ef4444'} />
                  <stop offset="100%" stopColor={healthScore >= 50 ? '#34d399' : '#f87171'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${getScoreColor(healthScore)}`}>{getScoreLabel(healthScore)}</span>
            </div>
          </div>

          <div className="flex-1 text-[10px] text-white/35 leading-relaxed">
            {healthScore >= 70
              ? 'Strong market conditions. High demand with moderate supply suggests good investment potential.'
              : healthScore >= 50
                ? 'Balanced market conditions. Supply and demand are relatively even in this area.'
                : healthScore >= 30
                  ? 'Buyer-favoring market. Higher supply relative to demand — more room for negotiation.'
                  : 'Weak market conditions. High supply and low demand — consider pricing competitively.'
            }
          </div>
        </div>
      </div>

      {/* Signal Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className="relative p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium">{metric.label}</div>
              <span className="text-xs">{metric.icon}</span>
            </div>

            <div className={`text-lg font-bold font-mono ${metric.isScore ? getScoreColor(metric.value) : 'text-white/80'}`}>
              {metric.display}
            </div>

            {/* Score bar for score-type metrics */}
            {metric.isScore && (
              <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(metric.value)} transition-all duration-700`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#0d1f38] border border-white/[0.08] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              <p className="text-[10px] text-white/40">{metric.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      {secondaryMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {secondaryMetrics.map((metric, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] group relative">
              <div className="text-[10px] text-white/30 mb-1">{metric.label}</div>
              <div className="text-sm font-semibold text-white/70 font-mono">{metric.value}</div>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#0d1f38] border border-white/[0.08] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                <p className="text-[10px] text-white/40">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data quality indicator */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 pt-2">
        <span className="w-1 h-1 rounded-full bg-white/10" />
        Based on {signals.dataPointCount > 0 ? signals.dataPointCount : 'estimated'} data points
        <span className="w-1 h-1 rounded-full bg-white/10" />
      </div>
    </div>
  )
}
