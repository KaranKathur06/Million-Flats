'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AIIndex™ Investment Intelligence Dashboard
// Wired to live /api/ai/investment endpoint
// Reads entityId + entityType from query params
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useSearchParams } from 'next/navigation'
import { useAIInvestment } from '@/hooks/useAIInvestment'
import { InvestmentGradeSkeleton, AIErrorState, AIEmptyState } from '@/components/ai-shared/AISkeletons'

const GRADE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  A_PLUS: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300' },
  A:      { bg: 'bg-emerald-400', text: 'text-white', ring: 'ring-emerald-200' },
  B_PLUS: { bg: 'bg-blue-500',    text: 'text-white', ring: 'ring-blue-300' },
  B:      { bg: 'bg-blue-400',    text: 'text-white', ring: 'ring-blue-200' },
  C_PLUS: { bg: 'bg-amber-500',   text: 'text-white', ring: 'ring-amber-300' },
  C:      { bg: 'bg-amber-400',   text: 'text-white', ring: 'ring-amber-200' },
  D:      { bg: 'bg-red-500',     text: 'text-white', ring: 'ring-red-300' },
}

function GradeDisplay({ grade }: { grade: string }) {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS['C']
  const label = grade.replace('_PLUS', '⁺').replace('_', '')
  return (
    <div className={`inline-flex items-center justify-center h-20 w-20 rounded-full ${colors.bg} ${colors.ring} ring-4 shadow-lg`}>
      <span className={`text-3xl font-black ${colors.text}`}>{label}</span>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function FactorBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-900 font-bold">{Math.round(pct)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AIIndexDashboard() {
  const searchParams = useSearchParams()
  const entityId = searchParams?.get('entityId') ?? null
  const entityType = (searchParams?.get('entityType') as 'MANUAL_PROPERTY' | 'PROJECT') ?? 'MANUAL_PROPERTY'

  const { data, loading, error, refresh } = useAIInvestment(entityId, entityType)

  if (!entityId) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] pt-20">
        <div className="container mx-auto max-w-3xl px-4">
          <AIEmptyState message="Select a property to load AIIndex™ investment intelligence" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto max-w-[1400px]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">AIIndex™</span>
          </div>
          <h1 className="text-3xl font-bold">Investment Intelligence</h1>
          <p className="text-gray-400 mt-1 text-sm">
            AI-powered investment scoring across 6 dimensions — liquidity, yield, risk-adjusted returns & more
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1400px] px-4 py-8">
        {loading ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <InvestmentGradeSkeleton />
            <div className="lg:col-span-2"><InvestmentGradeSkeleton /></div>
          </div>
        ) : error ? (
          <AIErrorState message={error} onRetry={refresh} />
        ) : !data ? (
          <AIEmptyState message="No investment data available for this property" />
        ) : (
          <div className="space-y-6">

            {/* Grade + Score Overview */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center text-center gap-4">
                <GradeDisplay grade={data.overallGrade.grade} />
                <div>
                  <p className="text-2xl font-black text-gray-900">{data.opportunityScore}/100</p>
                  <p className="text-sm text-gray-500 mt-1">{data.overallGrade.reasoning}</p>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  data.investmentStrategy === 'BUY_AND_HOLD' ? 'bg-emerald-100 text-emerald-700' :
                  data.investmentStrategy === 'RENTAL_INCOME' ? 'bg-blue-100 text-blue-700' :
                  data.investmentStrategy === 'FLIP' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {data.investmentStrategy?.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Sub-scores */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-5">Investment Factor Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Rental Income', score: data.rentalGrade.score },
                    { name: 'Capital Growth', score: data.growthGrade.score },
                    { name: 'Liquidity', score: data.liquidityGrade.score },
                    { name: 'Infrastructure', score: data.infrastructureGrade.score },
                    { name: 'Developer Quality', score: data.developerGrade.score },
                    { name: 'Legal Standing', score: data.legalGrade.score },
                  ].map((f) => (
                    <FactorBar key={f.name} label={f.name} score={f.score} />
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                label="Gross Yield"
                value={`${data.rentalYield.toFixed(1)}%`}
                sub="Annual rental return"
              />
              <MetricCard
                label="5yr Appreciation"
                value={`${data.capitalAppreciation.toFixed(1)}%`}
                sub="Capital growth"
              />
              <MetricCard
                label="Real Return"
                value={`${data.inflationAdjustedReturn.toFixed(1)}%`}
                sub="Inflation-adjusted"
              />
              <MetricCard
                label="Cash Flow"
                value={`${Math.round(data.cashflowScore)}/100`}
                sub="Rental quality"
              />
              <MetricCard
                label="Exit Potential"
                value={data.exitPotential}
                sub="Resale outlook"
              />
              <MetricCard
                label="Hold Period"
                value={`${data.bestHoldingPeriod.years}yr`}
                sub="Optimal hold"
              />
            </div>

            {/* Infrastructure Impact */}
            {data.nearbyInfrastructure.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-3">
                  ✅ Infrastructure Catalysts
                </h3>
                <ul className="space-y-2">
                  {data.nearbyInfrastructure.map((infra, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="mt-0.5">→</span>
                      <span>{infra.name} ({infra.type}) — est. +{infra.estimatedPriceImpactPct}% price impact</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Factors */}
            {data.keyRisks.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">
                  ⚠️ Key Risks
                </h3>
                <ul className="space-y-2">
                  {data.keyRisks.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-0.5">•</span>
                      <span>{f.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Model meta */}
            <div className="text-xs text-gray-400 text-right">
              AIIndex™ v{data.modelVersion} · Computed {new Date(data.computedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
