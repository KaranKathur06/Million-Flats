'use client'

import { useMemo } from 'react'
import type { TrendDataPoint } from '@/lib/verixshield/types'

interface TrendChartProps {
  trend: TrendDataPoint[]
  direction: 'up' | 'down' | 'stable'
  overallChange: number
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function formatMonth(period: string): string {
  const [year, month] = period.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(month)] || month} ${year?.slice(2) || ''}`
}

export function TrendChart({ trend, direction, overallChange }: TrendChartProps) {
  const chartData = useMemo(() => {
    if (trend.length === 0) return null

    const prices = trend.map(t => t.avgPricePerSqft)
    const min = Math.min(...prices) * 0.95
    const max = Math.max(...prices) * 1.05
    const range = max - min || 1

    const chartWidth = 100
    const chartHeight = 100
    const padding = { top: 8, bottom: 8, left: 0, right: 0 }
    const plotWidth = chartWidth - padding.left - padding.right
    const plotHeight = chartHeight - padding.top - padding.bottom

    const points = trend.map((d, i) => {
      const x = padding.left + (i / Math.max(1, trend.length - 1)) * plotWidth
      const y = padding.top + plotHeight - ((d.avgPricePerSqft - min) / range) * plotHeight
      return { x, y, data: d }
    })

    // Build smooth SVG path (Catmull-Rom to Bezier)
    const linePath = points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p, i) => {
          const prev = points[i]
          const cpx = (prev.x + p.x) / 2
          return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`
        }).join(' ')
      : ''

    // Area path (fill under curve)
    const areaPath = linePath
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
      : ''

    return { points, linePath, areaPath, min, max, range, chartWidth, chartHeight }
  }, [trend])

  if (!chartData || trend.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <p className="text-xs text-white/30 text-center py-8">No trend data available for this area</p>
      </div>
    )
  }

  const dirIcon = direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→'
  const dirColor = direction === 'up' ? 'text-emerald-400' : direction === 'down' ? 'text-red-400' : 'text-white/40'
  const gradientId = 'trend-gradient-' + Math.random().toString(36).slice(2, 8)
  const lineColor = direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#60a5fa'

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Price Trend</h3>
          <span className="text-[10px] text-white/25">(per sq ft)</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${dirColor}`}>
          <span>{dirIcon}</span>
          <span>{overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}%</span>
          <span className="text-[10px] text-white/25 font-normal">12mo</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full" style={{ aspectRatio: '3 / 1' }}>
        <svg
          viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map(pct => (
            <line
              key={pct}
              x1="0"
              y1={chartData.chartHeight * pct}
              x2={chartData.chartWidth}
              y2={chartData.chartHeight * pct}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.3"
            />
          ))}

          {/* Area fill */}
          <path d={chartData.areaPath} fill={`url(#${gradientId})`} />

          {/* Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {chartData.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill={lineColor}
              opacity={i === chartData.points.length - 1 ? 1 : 0.4}
              className="hover:opacity-100 transition-opacity"
            />
          ))}

          {/* Last point emphasis */}
          <circle
            cx={chartData.points[chartData.points.length - 1].x}
            cy={chartData.points[chartData.points.length - 1].y}
            r="3"
            fill={lineColor}
            opacity={0.2}
          />
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-0.5">
        {trend.filter((_, i) => i === 0 || i === Math.floor(trend.length / 2) || i === trend.length - 1).map((t, i) => (
          <span key={i} className="text-[9px] text-white/20 font-mono">
            {formatMonth(t.period)}
          </span>
        ))}
      </div>

      {/* Latest data point */}
      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-white/30">Latest avg/sqft</span>
        <span className="text-xs font-semibold text-white/70 font-mono">
          AED {formatCompact(trend[trend.length - 1].avgPricePerSqft)}
        </span>
      </div>
    </div>
  )
}
