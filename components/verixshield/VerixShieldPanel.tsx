'use client'

// ━━━ VerixShield Price Intelligence Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Premium analytics panel embedded on property/project detail pages
// Orchestrates all sub-components with loading states and error handling

import { useState, useEffect, useCallback } from 'react'
import type { VerixShieldResponse } from '@/lib/verixshield/types'
import { ValuationCard } from './ValuationCard'
import { PriceGauge } from './PriceGauge'
import { TrendChart } from './TrendChart'
import { ComparablesList } from './ComparablesList'
import { PriceDistributionBar } from './PriceDistributionBar'
import { MarketSignalsPanel } from './MarketSignalsPanel'
import { NegotiationInsight } from './NegotiationInsight'
import { RentalIntelligence } from './RentalIntelligence'

interface VerixShieldPanelProps {
  propertyId: string
  entityType: 'MANUAL_PROPERTY' | 'PROJECT'
  className?: string
  /** embed = sidebar widget (legacy); dashboard = full-width AI platform */
  variant?: 'embed' | 'dashboard'
  showHeader?: boolean
}

export function VerixShieldPanel({
  propertyId,
  entityType,
  className = '',
  variant = 'embed',
  showHeader = true,
}: VerixShieldPanelProps) {
  const [data, setData] = useState<VerixShieldResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'comparables' | 'signals' | 'trends'>('overview')
  const [trendPeriod, setTrendPeriod] = useState<'1y' | '3y' | '5y' | 'forecast'>('1y')
  const isDashboard = variant === 'dashboard'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/verixshield/${propertyId}?type=${entityType}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status})`)
      }
      const result: VerixShieldResponse = await res.json()
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Failed to load price intelligence')
    } finally {
      setLoading(false)
    }
  }, [propertyId, entityType])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <LoadingSkeleton isDashboard={isDashboard} />
  if (error && !data) return <ErrorState error={error} onRetry={fetchData} isDashboard={isDashboard} />
  if (!data) return null

  const tabs = [
    { key: 'overview' as const, label: isDashboard ? 'VerixShield™' : 'Overview', icon: '📊' },
    { key: 'comparables' as const, label: 'Comparables', icon: '🏘️' },
    { key: 'signals' as const, label: 'Market Signals', icon: '📡' },
    ...(isDashboard ? [{ key: 'trends' as const, label: 'Price Trend', icon: '📈' }] : []),
  ]

  const analysisInProgress = data.status === 'INSUFFICIENT_DATA'

  return (
    <section id="verixshield-panel" className={`relative ${className}`}>
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] ${isDashboard ? 'shadow-xl' : 'shadow-2xl'}`}>
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {showHeader && (
          <div className="relative px-5 sm:px-7 lg:px-10 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/20">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    AIShield<sup className="text-[10px] text-blue-400/80 ml-0.5">™</sup>
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">Price Intelligence Engine</p>
                </div>
              </div>
              <StatusBadge status={data.status} />
            </div>

            <div className={`flex gap-1 mt-5 p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.04] ${isDashboard ? 'flex-wrap' : ''}`}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="text-[11px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showHeader && (
          <div className="px-5 sm:px-7 lg:px-10 pt-5 pb-0 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <StatusBadge status={data.status} />
              <div className="flex flex-wrap gap-1 p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.04]">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      activeTab === tab.key
                        ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`relative px-5 sm:px-7 lg:px-10 py-5 lg:py-8 space-y-5 ${isDashboard ? 'lg:space-y-8' : ''}`}>
          {analysisInProgress && activeTab === 'overview' && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200/90">
              Analysis in Progress — gathering market comparables and trend data for this project.
            </div>
          )}

          {activeTab === 'overview' && (
            isDashboard ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-8">
                <div className="space-y-5">
                  <ValuationCard
                    valuation={data.valuation}
                    askingPrice={data.askingPrice}
                    deviation={data.deviation}
                    status={data.status}
                  />
                  <PriceGauge
                    valuation={data.valuation}
                    askingPrice={data.askingPrice}
                    pricePosition={data.pricePosition}
                    distribution={data.distribution}
                  />
                  <RentalIntelligence rental={data.rental} />
                  <NegotiationInsight
                    negotiation={data.negotiation}
                    status={data.status}
                    deviation={data.deviation}
                  />
                </div>
                <div className="space-y-5">
                  <TrendChart
                    trend={data.trend}
                    direction={data.trendDirection}
                    overallChange={data.trendOverallChange}
                  />
                  <PriceDistributionBar
                    distribution={data.distribution}
                    askingPrice={data.askingPrice}
                    valuation={data.valuation}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <ValuationCard
                  valuation={data.valuation}
                  askingPrice={data.askingPrice}
                  deviation={data.deviation}
                  status={data.status}
                />
                <PriceGauge
                  valuation={data.valuation}
                  askingPrice={data.askingPrice}
                  pricePosition={data.pricePosition}
                  distribution={data.distribution}
                />
                <TrendChart
                  trend={data.trend}
                  direction={data.trendDirection}
                  overallChange={data.trendOverallChange}
                />
                <PriceDistributionBar
                  distribution={data.distribution}
                  askingPrice={data.askingPrice}
                  valuation={data.valuation}
                />
                <RentalIntelligence rental={data.rental} />
                <NegotiationInsight
                  negotiation={data.negotiation}
                  status={data.status}
                  deviation={data.deviation}
                />
              </div>
            )
          )}

          {activeTab === 'comparables' && (
            <ComparablesList
              comparables={data.comparables}
              stats={data.comparablesStats}
              askingPrice={data.askingPrice}
            />
          )}

          {activeTab === 'signals' && (
            <MarketSignalsPanel signals={data.signals} />
          )}

          {activeTab === 'trends' && isDashboard && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['1y', '3y', '5y', 'forecast'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTrendPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      trendPeriod === p
                        ? 'bg-white/[0.1] text-white border-white/20'
                        : 'text-white/40 border-white/[0.06] hover:text-white/60'
                    }`}
                  >
                    {p === '1y' ? '1 Year' : p === '3y' ? '3 Year' : p === '5y' ? '5 Year' : 'Forecast'}
                  </button>
                ))}
              </div>
              {trendPeriod === 'forecast' ? (
                <div className="p-8 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                  <p className="text-sm text-white/40">AIIndex™ investment forecasting — Coming Soon</p>
                </div>
              ) : (
                <TrendChart
                  trend={data.trend}
                  direction={data.trendDirection}
                  overallChange={data.trendOverallChange}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between text-[10px] text-white/25">
            <span className="flex items-center gap-1">
              {data.meta.cached && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400/70 rounded text-[9px]">
                  cached
                </span>
              )}
              Model v{data.meta.modelVersion}
            </span>
            <span>
              Updated {new Date(data.meta.computedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    FAIR: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Fair Price' },
    OVERPRICED: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Overpriced' },
    UNDERPRICED: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Below Market' },
    SUSPICIOUS: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'Suspicious' },
    INSUFFICIENT_DATA: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400', label: 'Limited Data' },
  }

  const c = config[status] || config.INSUFFICIENT_DATA

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.bg} ${c.text} text-xs font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </div>
  )
}

// ── Loading Skeleton ──
function LoadingSkeleton({ isDashboard = false }: { isDashboard?: boolean }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] ${isDashboard ? 'shadow-xl min-h-[400px]' : 'shadow-2xl'} overflow-hidden`}>
      <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-40 bg-white/[0.03] rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-1 mt-5 p-0.5 bg-white/[0.03] rounded-lg">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-8 bg-white/[0.03] rounded-md animate-pulse" />
          ))}
        </div>
      </div>
      <div className="px-5 sm:px-7 py-5 space-y-5">
        {/* Valuation skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Gauge skeleton */}
        <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />
        {/* Chart skeleton */}
        <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" />
        {/* Distribution skeleton */}
        <div className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// ── Error State ──
function ErrorState({ error, onRetry, isDashboard = false }: { error: string; onRetry: () => void; isDashboard?: boolean }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] ${isDashboard ? 'shadow-xl' : 'shadow-2xl'} overflow-hidden`}>
      <div className="px-5 sm:px-7 py-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-4">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <p className="text-sm text-white/60 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium text-white/80 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg border border-white/[0.08] transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    </div>
  )
}

export default VerixShieldPanel
