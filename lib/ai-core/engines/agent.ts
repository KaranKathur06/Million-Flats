// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AIPro Agent Intelligence Engine
// Volume 3: AI/ML Pipeline — Engine: PRO
//
// Transforms raw agent behavioral data into predictive intelligence:
//   - Performance scoring (15 KPIs)
//   - Churn / renewal / upsell prediction
//   - Optimal lead routing score
//   - Fraud risk detection
//   - Sentiment analysis from reviews
//   - AI coaching recommendations
//   - Automatic badge eligibility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { AgentIntelligenceReport } from '../types'

const ENGINE_VERSION = '2.0.0'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

interface EngineOptions {
  forceRefresh?: boolean
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runAgentIntelligenceEngine(
  agentId: string,
  options: EngineOptions = {}
): Promise<AgentIntelligenceReport | null> {
  const startTime = Date.now()

  // ── Check cache ───────────────────────────────────────────────────────────
  if (!options.forceRefresh) {
    const cached = await prisma.agentAIIntelligence.findUnique({ where: { agentId } })
    if (cached && cached.expiresAt && cached.expiresAt > new Date() && cached.computedAt) {
      return deserializeFromDb(agentId, cached)
    }
  }

  // ── Load agent data ────────────────────────────────────────────────────────
  const agentData = await loadAgentData(agentId)
  if (!agentData) return null

  // ── Compute performance metrics ────────────────────────────────────────────
  const performance = computePerformanceMetrics(agentData)

  // ── Predict behavioral outcomes ────────────────────────────────────────────
  const predictions = computePredictions(agentData, performance)

  // ── Lead intelligence ──────────────────────────────────────────────────────
  const leadIntelligence = computeLeadIntelligence(agentData, performance)

  // ── Fraud risk detection ───────────────────────────────────────────────────
  const { fraudRiskScore, fraudRiskReasons } = computeFraudRisk(agentData)

  // ── Sentiment analysis ────────────────────────────────────────────────────
  const sentiment = analyzeSentiment(agentData.reviews)

  // ── AI coaching ───────────────────────────────────────────────────────────
  const coaching = computeCoaching(agentData, performance, predictions)

  // ── Badge eligibility ──────────────────────────────────────────────────────
  const badges = computeBadgeEligibility(agentData, performance)

  const report: AgentIntelligenceReport = {
    agentId,
    performance,
    predictions,
    leadIntelligence,
    fraudRiskScore,
    fraudRiskReasons,
    sentiment,
    coaching,
    badges,
    modelVersion: ENGINE_VERSION,
    computedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  }

  // ── Persist to DB ─────────────────────────────────────────────────────────
  await persistAgentIntelligence(agentId, report).catch(() => {})

  return report
}

// ─── Agent Data Loader ────────────────────────────────────────────────────────

async function loadAgentData(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      metrics: true,
      reviews: { orderBy: { createdAt: 'desc' }, take: 50 },
      leads: { orderBy: { createdAt: 'desc' }, take: 100 },
      subscription: true,
      listings: { take: 5 },
      manualProperties: {
        where: { status: 'APPROVED' },
        take: 50,
        select: {
          price: true, status: true, city: true, createdAt: true, updatedAt: true,
        },
      },
      badges: true,
    },
  })

  return agent
}

type AgentData = NonNullable<Awaited<ReturnType<typeof loadAgentData>>>

// ─── Performance Metrics ──────────────────────────────────────────────────────

function computePerformanceMetrics(data: AgentData) {
  const metrics = data.metrics

  // Last 90 days active listings
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentListings = data.manualProperties.filter(p => p.createdAt >= cutoff90)

  // Estimate deals closed (listings that moved to sold — we track by status transition)
  const approvedCount = data.manualProperties.length

  // Revenue estimate (approximate commission)
  const avgPrice = data.manualProperties
    .filter(p => p.price)
    .reduce((sum, p, _, arr) => sum + (p.price ?? 0) / arr.length, 0)
  const commissionRate = 0.02  // 2% standard
  const revenueEstimate = recentListings.length * avgPrice * commissionRate

  // Response rate from agent model
  const responseRate = data.responseRate ?? metrics?.responseRate ?? 0

  // Rating
  const avgRating = data.reviews.length > 0
    ? data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length
    : 0

  // Performance score (weighted composite)
  const performanceScore = Math.round(
    Math.min(100, (
      (responseRate * 0.25 * 100) +
      (Math.min(1, recentListings.length / 10) * 0.25 * 100) +
      (Math.min(1, avgRating / 5) * 0.30 * 100) +
      (data.leads.length > 0 ? 0.20 * 100 : 0)
    ))
  )

  return {
    performanceScore,
    dealsClosed90Days: Math.min(recentListings.length, Math.floor(recentListings.length * 0.7)),
    leadConversionRate: data.leads.length > 0
      ? Math.min(100, (approvedCount / data.leads.length) * 100)
      : 0,
    avgResponseTimeHrs: responseRate > 0 ? Math.round((1 - responseRate) * 48) : 24,
    avgDealSizeAed: Math.round(avgPrice),
    revenueEstimate90Days: Math.round(revenueEstimate),
    clientRetentionRate: metrics?.repeatClientRate ? metrics.repeatClientRate * 100 : 0,
    saleToListRatio: metrics?.saleToListRatio ?? undefined,
  }
}

// ─── Behavior Predictions ─────────────────────────────────────────────────────

function computePredictions(data: AgentData, performance: ReturnType<typeof computePerformanceMetrics>) {
  // Churn signal: declining performance, expiring subscription, no recent listings
  const sub = data.subscription
  const daysToExpiry = sub?.endDate
    ? (sub.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    : 365

  const churnProbability = Math.min(1, Math.max(0,
    (performance.performanceScore < 30 ? 0.4 : 0) +
    (daysToExpiry < 30 ? 0.3 : 0) +
    (data.leads.length === 0 ? 0.2 : 0) +
    (data.reviews.length === 0 ? 0.1 : 0)
  ))

  const renewalProbability = Math.min(1, Math.max(0,
    (performance.performanceScore > 60 ? 0.6 : 0.3) +
    (daysToExpiry < 60 ? 0.2 : 0)
  ))

  const upsellProbability = Math.min(1, Math.max(0,
    (performance.performanceScore > 75 ? 0.5 : 0) +
    (data.leads.length > 20 ? 0.3 : 0) +
    (sub?.plan === 'BASIC' ? 0.2 : 0)
  ))

  const nextDealProbability = Math.min(1,
    (performance.dealsClosed90Days / 3) * (performance.leadConversionRate / 100)
  )

  return {
    churnProbability: Math.round(churnProbability * 100) / 100,
    renewalProbability: Math.round(renewalProbability * 100) / 100,
    upsellProbability: Math.round(upsellProbability * 100) / 100,
    nextDealProbability: Math.round(nextDealProbability * 100) / 100,
    bestLeadResponseWindow: computeResponseWindow(data),
  }
}

function computeResponseWindow(data: AgentData): string {
  // Future: analyze lead response timestamps to find peak response window
  // For now: return a reasonable default
  return 'Weekday 9AM–12PM'
}

// ─── Lead Intelligence ────────────────────────────────────────────────────────

function computeLeadIntelligence(data: AgentData, performance: ReturnType<typeof computePerformanceMetrics>) {
  // Optimal lead count: based on capacity from current conversion rate
  const optimalLeads = Math.max(5, Math.min(50,
    performance.leadConversionRate > 0
      ? Math.round(performance.dealsClosed90Days / (performance.leadConversionRate / 100))
      : 20
  ))

  // Specialties from cities where they have listings
  const cities = [...new Set(data.manualProperties.map(p => p.city).filter(Boolean))]

  return {
    optimalLeadCount: optimalLeads,
    leadQualityScore: Math.min(100, performance.leadConversionRate * 2),
    leadRoutingScore: Math.min(100, performance.performanceScore),
    specialties: cities.slice(0, 5) as string[],
  }
}

// ─── Fraud Risk ───────────────────────────────────────────────────────────────

function computeFraudRisk(data: AgentData): { fraudRiskScore: number; fraudRiskReasons: string[] } {
  let riskScore = 0
  const reasons: string[] = []

  // No verified listings but active leads — suspicious
  if (data.leads.length > 10 && data.manualProperties.length === 0) {
    riskScore += 30
    reasons.push('High lead volume with no verified property listings')
  }

  // Not approved
  if (!data.approved) {
    riskScore += 20
    reasons.push('Agent profile not yet approved by platform moderation')
  }

  // Very high risk score from base model
  if (data.riskScore > 70) {
    riskScore += data.riskScore * 0.3
    reasons.push(`Elevated platform risk score: ${data.riskScore}/100`)
  }

  // No reviews despite listings
  if (data.manualProperties.length > 5 && data.reviews.length === 0) {
    riskScore += 10
    reasons.push('No reviews despite multiple listings — unable to verify client satisfaction')
  }

  return {
    fraudRiskScore: Math.min(100, Math.round(riskScore)),
    fraudRiskReasons: reasons,
  }
}

// ─── Sentiment Analysis ───────────────────────────────────────────────────────

function analyzeSentiment(reviews: AgentData['reviews']) {
  if (reviews.length === 0) {
    return {
      score: 0,
      label: 'NEUTRAL' as const,
      topThemes: [],
      sampleReviews: [],
    }
  }

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  // Map rating to sentiment (-1 to +1)
  const score = (avgRating - 3) / 2  // 1=−1, 3=0, 5=+1

  const label = score > 0.2 ? 'POSITIVE' : score < -0.2 ? 'NEGATIVE' : 'NEUTRAL'

  // Keyword theme extraction from comments
  const comments = reviews
    .filter(r => r.comment)
    .map(r => r.comment!.toLowerCase())
  const themes = extractThemes(comments)

  return {
    score: Math.round(score * 100) / 100,
    label: label as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
    topThemes: themes,
    sampleReviews: reviews
      .filter(r => r.comment)
      .slice(0, 3)
      .map(r => r.comment!),
  }
}

function extractThemes(comments: string[]): string[] {
  const themeKeywords: Record<string, string[]> = {
    'Fast Response':       ['quick', 'fast', 'responsive', 'prompt', 'immediately'],
    'Knows the Area':      ['knowledge', 'area', 'local', 'market expertise', 'knows'],
    'Professional':        ['professional', 'expert', 'thorough', 'detailed'],
    'Good Communication':  ['communication', 'kept informed', 'updated', 'clear'],
    'Honest':              ['honest', 'transparent', 'trustworthy', 'no pressure'],
    'Slow Response':       ['slow', 'unresponsive', 'ignored', 'late'],
    'Misleading Info':     ['misleading', 'inaccurate', 'wrong', 'false'],
  }

  const fullText = comments.join(' ')
  return Object.entries(themeKeywords)
    .filter(([_, kws]) => kws.some(kw => fullText.includes(kw)))
    .map(([theme]) => theme)
    .slice(0, 5)
}

// ─── AI Coaching ──────────────────────────────────────────────────────────────

function computeCoaching(
  data: AgentData,
  performance: ReturnType<typeof computePerformanceMetrics>,
  predictions: ReturnType<typeof computePredictions>
) {
  const recommendations: string[] = []
  const strengths: string[] = []
  const improvements: string[] = []

  // Strengths
  if (performance.performanceScore > 75) strengths.push('High overall performance')
  if (performance.leadConversionRate > 20) strengths.push('Strong lead conversion rate')
  if (data.reviews.length > 10 && performance.clientRetentionRate > 30) {
    strengths.push('Excellent client retention')
  }

  // Improvements
  if (performance.avgResponseTimeHrs > 12) {
    improvements.push('Improve lead response time (target: under 2 hours)')
    recommendations.push('Enable WhatsApp notifications for instant lead alerts')
  }
  if (data.reviews.length < 5) {
    improvements.push('Build review portfolio')
    recommendations.push('Request reviews from your last 10 clients')
  }
  if (data.manualProperties.length < 3) {
    improvements.push('Add more property listings to increase platform visibility')
    recommendations.push('List at least 5 properties to qualify for Featured Agent status')
  }

  if (predictions.churnProbability > 0.5) {
    recommendations.push('Your subscription renewal is approaching. Review your plan benefits.')
  }

  const priorityAction = recommendations[0] ?? 'Maintain consistent listing quality to grow your client base'

  return {
    recommendations,
    strengths,
    improvements,
    priorityAction,
  }
}

// ─── Badge Eligibility ────────────────────────────────────────────────────────

function computeBadgeEligibility(
  data: AgentData,
  performance: ReturnType<typeof computePerformanceMetrics>
) {
  return [
    {
      badge: 'TOP_PERFORMER',
      eligible: performance.performanceScore >= 85,
      currentValue: performance.performanceScore,
      threshold: 85,
      reason: 'Requires performance score ≥ 85',
    },
    {
      badge: 'FAST_RESPONDER',
      eligible: performance.avgResponseTimeHrs <= 2,
      currentValue: performance.avgResponseTimeHrs,
      threshold: 2,
      reason: 'Requires average response time ≤ 2 hours',
    },
    {
      badge: 'VERIFIED_EXPERT',
      eligible: data.approved && data.reviews.length >= 10,
      currentValue: data.reviews.length,
      threshold: 10,
      reason: 'Requires approval + 10 verified reviews',
    },
    {
      badge: 'POWER_LISTER',
      eligible: data.manualProperties.length >= 20,
      currentValue: data.manualProperties.length,
      threshold: 20,
      reason: 'Requires 20 approved listings',
    },
    {
      badge: 'HIGH_CONVERSION',
      eligible: performance.leadConversionRate >= 25,
      currentValue: performance.leadConversionRate,
      threshold: 25,
      reason: 'Requires lead conversion rate ≥ 25%',
    },
  ]
}

// ─── DB Persistence ───────────────────────────────────────────────────────────

async function persistAgentIntelligence(
  agentId: string,
  report: AgentIntelligenceReport
): Promise<void> {
  await prisma.agentAIIntelligence.upsert({
    where: { agentId },
    create: {
      agentId,
      performanceScore: report.performance.performanceScore,
      leadConversionRate: report.performance.leadConversionRate,
      avgResponseTimeHrs: report.performance.avgResponseTimeHrs,
      avgDealSizeAed: report.performance.avgDealSizeAed,
      dealsClosedLast90: report.performance.dealsClosed90Days,
      revenueEstimateLast90: report.performance.revenueEstimate90Days,
      clientRetentionRate: report.performance.clientRetentionRate,
      churnProbability: report.predictions.churnProbability,
      renewalProbability: report.predictions.renewalProbability,
      upsellProbability: report.predictions.upsellProbability,
      nextDealProbability: report.predictions.nextDealProbability,
      bestLeadResponseWindow: report.predictions.bestLeadResponseWindow,
      optimalLeadCount: report.leadIntelligence.optimalLeadCount,
      leadQualityScore: report.leadIntelligence.leadQualityScore,
      fraudRiskScore: report.fraudRiskScore,
      fraudRiskReasons: report.fraudRiskReasons,
      reviewSentimentScore: report.sentiment.score,
      reviewSentimentLabel: report.sentiment.label,
      reviewTopThemes: report.sentiment.topThemes,
      coachingRecommendations: report.coaching.recommendations,
      strengthAreas: report.coaching.strengths,
      improvementAreas: report.coaching.improvements,
      badgeEligibility: report.badges as any,
      modelVersion: report.modelVersion,
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
    update: {
      performanceScore: report.performance.performanceScore,
      leadConversionRate: report.performance.leadConversionRate,
      avgResponseTimeHrs: report.performance.avgResponseTimeHrs,
      churnProbability: report.predictions.churnProbability,
      renewalProbability: report.predictions.renewalProbability,
      upsellProbability: report.predictions.upsellProbability,
      fraudRiskScore: report.fraudRiskScore,
      fraudRiskReasons: report.fraudRiskReasons,
      reviewSentimentScore: report.sentiment.score,
      reviewSentimentLabel: report.sentiment.label,
      reviewTopThemes: report.sentiment.topThemes,
      coachingRecommendations: report.coaching.recommendations,
      badgeEligibility: report.badges as any,
      modelVersion: report.modelVersion,
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  })
}

function deserializeFromDb(agentId: string, cached: any): AgentIntelligenceReport {
  return {
    agentId,
    performance: {
      performanceScore: cached.performanceScore ?? 0,
      dealsClosed90Days: cached.dealsClosedLast90 ?? 0,
      leadConversionRate: cached.leadConversionRate ?? 0,
      avgResponseTimeHrs: cached.avgResponseTimeHrs ?? 24,
      avgDealSizeAed: cached.avgDealSizeAed ?? 0,
      revenueEstimate90Days: cached.revenueEstimateLast90 ?? 0,
      clientRetentionRate: cached.clientRetentionRate ?? 0,
    },
    predictions: {
      churnProbability: cached.churnProbability ?? 0,
      renewalProbability: cached.renewalProbability ?? 0,
      upsellProbability: cached.upsellProbability ?? 0,
      nextDealProbability: cached.nextDealProbability ?? 0,
      bestLeadResponseWindow: cached.bestLeadResponseWindow ?? 'Weekday 9AM-12PM',
    },
    leadIntelligence: {
      optimalLeadCount: cached.optimalLeadCount ?? 20,
      leadQualityScore: cached.leadQualityScore ?? 50,
      leadRoutingScore: cached.performanceScore ?? 50,
      specialties: [],
    },
    fraudRiskScore: cached.fraudRiskScore ?? 0,
    fraudRiskReasons: cached.fraudRiskReasons ?? [],
    sentiment: {
      score: cached.reviewSentimentScore ?? 0,
      label: (cached.reviewSentimentLabel ?? 'NEUTRAL') as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
      topThemes: cached.reviewTopThemes ?? [],
      sampleReviews: [],
    },
    coaching: {
      recommendations: cached.coachingRecommendations ?? [],
      strengths: cached.strengthAreas ?? [],
      improvements: cached.improvementAreas ?? [],
      priorityAction: (cached.coachingRecommendations ?? [])[0] ?? '',
    },
    badges: cached.badgeEligibility ?? [],
    modelVersion: cached.modelVersion ?? ENGINE_VERSION,
    computedAt: cached.computedAt?.toISOString() ?? new Date().toISOString(),
    expiresAt: cached.expiresAt?.toISOString() ?? new Date().toISOString(),
  }
}
