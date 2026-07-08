'use client'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AIPro™ Agent Intelligence Dashboard
// Wired to live /api/ai/agent endpoint
// Shows performance score, churn prediction, coaching, badge eligibility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useCallback, useEffect, useState } from 'react'
import type { AgentIntelligenceReport } from '@/lib/ai-core/types'
import { AIInsightSkeleton, AIErrorState, AIEmptyState } from '@/components/ai-shared/AISkeletons'

// ─── Mini Components ──────────────────────────────────────────────────────────

function ScoreRing({ score, label, color = '#3b82f6' }: { score: number; label: string; color?: string }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="800" fill="#0f172a">
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function PredictionBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-900">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function Badge({ badge, eligible, currentValue, threshold }: any) {
  const badgeLabels: Record<string, { icon: string; name: string }> = {
    TOP_PERFORMER:   { icon: '🏆', name: 'Top Performer' },
    FAST_RESPONDER:  { icon: '⚡', name: 'Fast Responder' },
    VERIFIED_EXPERT: { icon: '✅', name: 'Verified Expert' },
    POWER_LISTER:    { icon: '🏠', name: 'Power Lister' },
    HIGH_CONVERSION: { icon: '🎯', name: 'High Conversion' },
  }
  const info = badgeLabels[badge] ?? { icon: '🎖️', name: badge }
  return (
    <div className={`rounded-xl border p-3 text-center space-y-1 transition-all ${
      eligible ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50 opacity-60'
    }`}>
      <div className="text-2xl">{info.icon}</div>
      <p className="text-xs font-bold text-gray-700">{info.name}</p>
      <p className="text-xs text-gray-400">
        {currentValue} / {threshold}
      </p>
      {eligible && (
        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Earned</span>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

interface Props {
  agentId: string
}

export function AIProDashboard({ agentId }: Props) {
  const [data, setData] = useState<AgentIntelligenceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/agent?agentId=${agentId}${force ? '&forceRefresh=true' : ''}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Failed to load')
      setData(json.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-6"><AIInsightSkeleton /></div>
  if (error) return <AIErrorState message={error} onRetry={() => load(true)} />
  if (!data) return <AIEmptyState />

  const sentiment = data.sentiment
  const sentimentColor = sentiment.label === 'POSITIVE' ? '#10b981' : sentiment.label === 'NEGATIVE' ? '#ef4444' : '#6b7280'

  return (
    <div className="space-y-6">

      {/* Score rings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Performance Metrics</h3>
        <div className="flex flex-wrap justify-around gap-6">
          <ScoreRing score={data.performance.performanceScore} label="Performance" color="#3b82f6" />
          <ScoreRing score={data.leadIntelligence.leadQualityScore} label="Lead Quality" color="#8b5cf6" />
          <ScoreRing score={100 - data.fraudRiskScore} label="Trust Score" color="#10b981" />
          <ScoreRing score={Math.round(sentiment.score * 50 + 50)} label="Sentiment" color={sentimentColor} />
        </div>
      </div>

      {/* Predictions */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Behavioral Predictions</h3>
        <div className="space-y-4">
          <PredictionBar label="Renewal Probability" value={data.predictions.renewalProbability} color="bg-emerald-500" />
          <PredictionBar label="Upsell Probability" value={data.predictions.upsellProbability} color="bg-blue-500" />
          <PredictionBar label="Next Deal (30d)" value={data.predictions.nextDealProbability} color="bg-violet-500" />
          <PredictionBar label="Churn Risk" value={data.predictions.churnProbability} color="bg-red-500" />
        </div>
        <div className="mt-4 text-xs text-gray-400">
          Best lead response window: <span className="font-bold text-gray-600">{data.predictions.bestLeadResponseWindow}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Deals Closed (90d)', value: String(data.performance.dealsClosed90Days) },
          { label: 'Lead Conversion', value: `${data.performance.leadConversionRate.toFixed(1)}%` },
          { label: 'Avg Response', value: `${data.performance.avgResponseTimeHrs}h` },
          { label: 'Avg Deal Size', value: data.performance.avgDealSizeAed ? `AED ${(data.performance.avgDealSizeAed / 1000000).toFixed(1)}M` : '—' },
          { label: 'Revenue Est. (90d)', value: data.performance.revenueEstimate90Days ? `AED ${(data.performance.revenueEstimate90Days / 1000).toFixed(0)}K` : '—' },
          { label: 'Optimal Leads/mo', value: String(data.leadIntelligence.optimalLeadCount) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-black text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* AI Coaching */}
      {data.coaching.recommendations.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">🤖 AI Coaching Recommendations</h3>
          <p className="text-sm font-bold text-blue-800 mb-3">Priority: {data.coaching.priorityAction}</p>
          <ul className="space-y-1.5">
            {data.coaching.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                <span className="text-blue-400 mt-0.5">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review Sentiment */}
      {sentiment.topThemes.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Client Sentiment</h3>
          <div className="flex flex-wrap gap-2">
            {sentiment.topThemes.map((theme: string) => (
              <span key={theme} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">{theme}</span>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Badge Eligibility</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {data.badges.map((b: any) => (
            <Badge key={b.badge} {...b} />
          ))}
        </div>
      </div>

      {/* Fraud Alerts */}
      {data.fraudRiskScore > 40 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2">⚠️ Risk Alerts</h3>
          <ul className="space-y-1">
            {data.fraudRiskReasons.map((r, i) => (
              <li key={i} className="text-sm text-red-700">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-gray-400 text-right">
        AIPro™ v{data.modelVersion} · {new Date(data.computedAt).toLocaleString()}
      </div>
    </div>
  )
}
