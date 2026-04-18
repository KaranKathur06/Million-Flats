'use client'

// ━━━ VerixShield v2.1 — Intelligence Engine Panel ━━━━━━━━━━━━━━━━━━━━━━━
// Upgraded panel with 4 tabs: Overview, Comparables, Signals, Insights
// Includes DataReliabilityIndicator, MarketPositionBadge, WhyThisPrice

import { useState, useEffect, useCallback } from 'react'
import type { VerixShieldResponseV2 } from '@/lib/verixshield/types-v2'
import { ValuationCard } from './ValuationCard'
import { PriceGauge } from './PriceGauge'
import { TrendChart } from './TrendChart'
import { ComparablesList } from './ComparablesList'
import { PriceDistributionBar } from './PriceDistributionBar'
import { MarketSignalsPanel } from './MarketSignalsPanel'
import { NegotiationInsight } from './NegotiationInsight'
import { RentalIntelligence } from './RentalIntelligence'
import { DataReliabilityIndicator } from './DataReliabilityIndicator'
import { MarketPositionBadge } from './MarketPositionBadge'
import { WhyThisPrice } from './WhyThisPrice'

interface Props {
  propertyId: string
  entityType: 'MANUAL_PROPERTY' | 'PROJECT'
  className?: string
}

type TabKey = 'overview' | 'comparables' | 'signals' | 'insights'

export function VerixShieldPanelV2({ propertyId, entityType, className = '' }: Props) {
  const [data, setData] = useState<VerixShieldResponseV2 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/verixshield/v2/${propertyId}?type=${entityType}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status})`)
      }
      const result: VerixShieldResponseV2 = await res.json()
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

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState error={error} onRetry={fetchData} />
  if (!data) return null

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'comparables', label: 'Comparables', icon: '🏘️' },
    { key: 'signals', label: 'Signals', icon: '📡' },
    { key: 'insights', label: 'Insights', icon: '💡' },
  ]

  // Adapt v2.1 response to v1 component interfaces
  const v1Valuation = {
    min: data.valuation.low,
    max: data.valuation.high,
    median: data.valuation.fair,
    confidence: data.valuation.confidence,
    confidenceReasons: data.valuation.confidenceFactors.map(f => f.reason),
  }

  // Map v2.1 status values to v1 status for existing components
  const mappedStatus = data.status === 'ABOVE_MARKET' ? 'OVERPRICED'
    : data.status === 'HIGH_RISK' ? 'SUSPICIOUS'
    : data.status

  return (
    <section id="verixshield-panel-v2" className={`relative ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] shadow-2xl">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/20">
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  VerixShield<sup className="text-[10px] text-blue-400/80 ml-0.5">™</sup>
                </h2>
                <p className="text-xs text-white/40 mt-0.5">Intelligence Engine v{data.meta.modelVersion}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConfidenceGradeBadge grade={data.valuation.confidenceGrade} score={data.valuation.confidence} />
              <StatusBadge status={mappedStatus} />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-5 p-0.5 bg-white/[0.03] rounded-lg border border-white/[0.04]">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                <span className="text-[11px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="relative px-5 sm:px-7 py-5 space-y-5">
          {activeTab === 'overview' && (
            <>
              {/* Data Reliability — first thing user sees */}
              <DataReliabilityIndicator dataQuality={data.dataQuality} />

              <ValuationCard
                valuation={v1Valuation}
                askingPrice={data.askingPrice}
                deviation={data.deviation}
                status={mappedStatus}
              />

              {/* Market Position — "Priced higher than X%" */}
              <MarketPositionBadge position={data.relativePosition} />

              <PriceGauge
                valuation={v1Valuation}
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
                valuation={v1Valuation}
              />

              <RentalIntelligence rental={data.rental} />

              <NegotiationInsight
                negotiation={data.negotiation}
                status={mappedStatus}
                deviation={data.deviation}
              />
            </>
          )}

          {activeTab === 'comparables' && (
            <ComparablesList
              comparables={data.comparables.map(c => ({
                id: c.id,
                title: c.title,
                price: c.price,
                pricePerSqft: c.pricePerSqft,
                sqft: c.sqft,
                bhk: c.bhk,
                city: c.city,
                community: c.community,
                distance: c.distance,
                source: c.source,
                similarity: c.similarity,
              }))}
              stats={data.comparablesStats}
              askingPrice={data.askingPrice}
            />
          )}

          {activeTab === 'signals' && (
            <div className="space-y-5">
              <MarketSignalsPanel signals={data.signals} />

              {/* Demand Intelligence */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                    <span>🔥</span> Demand Intelligence
                  </h3>
                  <DemandBadge level={data.demandIntelligence.level} />
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">{data.demandIntelligence.narrative}</p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <MiniStat label="Views" value={data.demandIntelligence.signals.viewCount} />
                  <MiniStat label="Saves" value={data.demandIntelligence.signals.saveCount} />
                  <MiniStat label="Enquiries" value={data.demandIntelligence.signals.enquiryCount} />
                </div>
              </div>

              {/* Market Volatility */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <h3 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-3">
                  <span>📈</span> Market Volatility
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-white">{data.marketVolatilityIndex.index.toFixed(2)}</span>
                    <span className="text-[10px] text-white/30 ml-2">{data.marketVolatilityIndex.classification}</span>
                  </div>
                  <span className="text-[10px] text-white/30">
                    Threshold: ±{data.marketVolatilityIndex.effectiveThreshold.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-5">
              {/* Why This Price — full explanation */}
              <WhyThisPrice
                explanation={data.explanation}
                adjustmentFactors={data.adjustmentFactors}
              />

              {/* Confidence Breakdown — 7 factors */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <h3 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-4">
                  <span>🎯</span> Confidence Breakdown
                </h3>
                {data.valuation.confidenceFactors.map((factor, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <span className="text-[11px] text-white/40 w-36 shrink-0">{factor.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${factor.score}%`,
                          background: factor.score >= 70
                            ? '#10b981'
                            : factor.score >= 40
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white/50 w-8 text-right">{Math.round(factor.score)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
                  <span className="text-xs text-white/50">Overall Confidence</span>
                  <span className="text-lg font-bold text-white">{data.valuation.confidence}%</span>
                </div>
              </div>

              {/* Historical Accuracy */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <h3 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-2">
                  <span>📋</span> Historical Accuracy
                </h3>
                <p className="text-[11px] text-white/40">{data.historicalAccuracy.detail}</p>
                {data.historicalAccuracy.mape !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-white/30">MAPE:</span>
                    <span className={`text-xs font-semibold ${
                      data.historicalAccuracy.mape <= 10 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {data.historicalAccuracy.mape.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-white/20">
                      ({data.historicalAccuracy.sampleSize} verified sales)
                    </span>
                  </div>
                )}
              </div>

              {/* Fusion Method */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                <h3 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-2">
                  <span>⚡</span> Valuation Method
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-3 rounded-full bg-white/[0.05] overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-400/80 transition-all duration-500"
                      style={{ width: `${data.fusion.compWeight * 100}%` }}
                    />
                    <div
                      className="h-full bg-purple-400/80 transition-all duration-500"
                      style={{ width: `${data.fusion.mlWeight * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-1.5 text-[10px]">
                  <span className="text-cyan-400/70">
                    Comparables {Math.round(data.fusion.compWeight * 100)}%
                  </span>
                  <span className="text-purple-400/70">
                    ML ({data.fusion.modelSegment}) {Math.round(data.fusion.mlWeight * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between text-[10px] text-white/25">
            <span className="flex items-center gap-1.5">
              {data.meta.cached && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400/70 rounded text-[9px]">
                  cached
                </span>
              )}
              v{data.meta.modelVersion}
              {data.meta.computeTimeMs && !data.meta.cached && (
                <span className="text-white/15">• {data.meta.computeTimeMs}ms</span>
              )}
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

// ── Confidence Grade Badge ──
function ConfidenceGradeBadge({ grade, score }: { grade: string; score: number }) {
  const colors: Record<string, string> = {
    A: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/20',
    B: 'bg-blue-500/15 text-blue-400 border-blue-400/20',
    C: 'bg-amber-500/15 text-amber-400 border-amber-400/20',
    D: 'bg-orange-500/15 text-orange-400 border-orange-400/20',
    F: 'bg-red-500/15 text-red-400 border-red-400/20',
  }
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${colors[grade] || colors.C}`}>
      <span>{score}%</span>
      <span className="opacity-60">({grade})</span>
    </div>
  )
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    FAIR: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Fair Price' },
    OVERPRICED: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400', label: 'Above Market' },
    UNDERPRICED: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Below Market' },
    SUSPICIOUS: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', label: 'High Risk' },
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

// ── Demand Badge ──
function DemandBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    HOT: { bg: 'bg-red-500/15', text: 'text-red-400' },
    WARM: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    NORMAL: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
    COLD: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  }
  const c = config[level] || config.NORMAL
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>{level}</span>
}

// ── Mini Stat ──
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 rounded-lg bg-white/[0.02]">
      <span className="text-base font-bold text-white">{value}</span>
      <span className="block text-[9px] text-white/30 mt-0.5">{label}</span>
    </div>
  )
}

// ── Loading Skeleton ──
function LoadingSkeleton() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] shadow-2xl overflow-hidden">
      <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-40 bg-white/[0.03] rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-1 mt-5 p-0.5 bg-white/[0.03] rounded-lg">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-8 bg-white/[0.03] rounded-md animate-pulse" />
          ))}
        </div>
      </div>
      <div className="px-5 sm:px-7 py-5 space-y-4">
        <div className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
        <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
      </div>
    </div>
  )
}

// ── Error State ──
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132d50] border border-white/[0.06] shadow-2xl overflow-hidden">
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

export default VerixShieldPanelV2
