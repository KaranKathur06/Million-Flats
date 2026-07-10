// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Recommendation Engine
// Phase 10: Recommendation Engine (Wave 1)
//
// Generates actionable investment recommendations with full evidence chain.
// Output: STRONG_BUY → BUY → WATCH → HOLD → HIGH_RISK → AVOID
//
// Every recommendation includes:
//   Why + Pros + Cons + Risks + Holding Period + Investor Type +
//   Alternative Communities + Exit Strategy + Market Comparison
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { InvestmentIntelligence, GradeDetail } from '../types'
import type { EvidenceBundle } from './evidence'

// ─── Recommendation Result ───────────────────────────────────────────────────

export type RecommendationTier =
  | 'STRONG_BUY'
  | 'BUY'
  | 'WATCH'
  | 'HOLD'
  | 'HIGH_RISK'
  | 'AVOID'

export interface RecommendationResult {
  /** The recommendation tier */
  recommendation: RecommendationTier

  /** One-line headline */
  headline: string

  /** Top 3 reasons for this recommendation */
  why: string[]

  /** Detailed pros */
  pros: RecommendationFactor[]

  /** Detailed cons */
  cons: RecommendationFactor[]

  /** Identified risks with mitigations */
  risks: RecommendationRisk[]

  /** Optimal holding strategy */
  holdingPeriod: {
    years: number
    reasoning: string
  }

  /** Who this is suitable for */
  investorType: InvestorProfile[]

  /** Who this is NOT suitable for */
  notSuitableFor: string[]

  /** Better alternatives in nearby areas */
  alternativeCommunities: AlternativeCommunity[]

  /** How to exit this investment */
  exitStrategy: {
    timeline: string
    approach: string
    expectedReturn: string
  }

  /** How this compares to the broader market */
  comparisonToMarket: string
  comparisonToCity: string

  /** Confidence in this recommendation */
  confidence: number
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK'
}

export interface RecommendationFactor {
  factor: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  evidence: string
}

export interface RecommendationRisk {
  name: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  mitigation: string
}

export type InvestorProfile =
  | 'LONG_TERM_INVESTOR'
  | 'RENTAL_INCOME_SEEKER'
  | 'AGGRESSIVE_GROWTH'
  | 'CONSERVATIVE'
  | 'FIRST_TIME_BUYER'
  | 'PORTFOLIO_DIVERSIFIER'
  | 'SHORT_TERM_FLIP'

export interface AlternativeCommunity {
  name: string
  whyBetter: string
  estimatedScore: number
}

// ─── Generate Recommendation ─────────────────────────────────────────────────

/**
 * Generate an investment recommendation based on investment grades and evidence.
 */
export function generateRecommendation(
  investment: InvestmentIntelligence,
  evidence: EvidenceBundle
): RecommendationResult {
  const overallScore = investment.overallGrade?.score ?? 0
  const grades = extractGrades(investment)

  // ── Determine recommendation tier ──────────────────────────────────────────
  const { tier, headline } = determineRecommendationTier(overallScore, grades, evidence)

  // ── Build pros ─────────────────────────────────────────────────────────────
  const pros = buildPros(grades, evidence)

  // ── Build cons ─────────────────────────────────────────────────────────────
  const cons = buildCons(grades, evidence)

  // ── Build risks ────────────────────────────────────────────────────────────
  const risks = evidence.risks.map(r => ({
    name: r.category,
    severity: r.severity,
    description: r.description,
    mitigation: r.mitigation ?? 'Monitor and reassess periodically',
  }))

  // ── Determine holding period ───────────────────────────────────────────────
  const holdingPeriod = determineHoldingPeriod(grades, evidence)

  // ── Determine investor profiles ────────────────────────────────────────────
  const { suitable, notSuitable } = determineInvestorProfiles(grades, evidence)

  // ── Build why ──────────────────────────────────────────────────────────────
  const why = buildWhyReasons(tier, pros, cons, evidence)

  // ── Exit strategy ──────────────────────────────────────────────────────────
  const exitStrategy = buildExitStrategy(grades, evidence)

  // ── Market comparison ──────────────────────────────────────────────────────
  const { comparisonToMarket, comparisonToCity } = buildMarketComparison(
    overallScore, evidence
  )

  // ── Evidence strength ──────────────────────────────────────────────────────
  const evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' =
    evidence.stats.totalDataPoints > 50 ? 'STRONG' :
    evidence.stats.totalDataPoints > 20 ? 'MODERATE' : 'WEAK'

  return {
    recommendation: tier,
    headline,
    why,
    pros,
    cons,
    risks,
    holdingPeriod,
    investorType: suitable,
    notSuitableFor: notSuitable,
    alternativeCommunities: [], // Populated when market intelligence dashboard is ready
    exitStrategy,
    comparisonToMarket,
    comparisonToCity,
    confidence: evidence.quality.overall,
    evidenceStrength,
  }
}

// ─── Tier Determination ──────────────────────────────────────────────────────

function determineRecommendationTier(
  overallScore: number,
  grades: GradeMap,
  evidence: EvidenceBundle
): { tier: RecommendationTier; headline: string } {
  const hasHighRisks = evidence.risks.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL').length > 0
  const marketHeat = evidence.market.marketHeat
  const yoyGrowth = evidence.market.priceChangeYoyPct
  const rentalYield = evidence.market.rentalYield

  // AVOID: Very low score OR critical risks
  if (overallScore < 30 || evidence.risks.some(r => r.severity === 'CRITICAL')) {
    return {
      tier: 'AVOID',
      headline: 'Avoid — Significant risks outweigh potential returns',
    }
  }

  // HIGH_RISK: Low score with high risks
  if (overallScore < 45 || (overallScore < 55 && hasHighRisks)) {
    return {
      tier: 'HIGH_RISK',
      headline: `High Risk — ${hasHighRisks ? 'Multiple risk factors detected' : 'Below-average investment profile'}`,
    }
  }

  // STRONG_BUY: Excellent score + growth + yield + heat
  if (overallScore >= 80 && yoyGrowth > 5 && rentalYield > 5) {
    return {
      tier: 'STRONG_BUY',
      headline: `Strong Buy — ${rentalYield.toFixed(1)}% yield with ${yoyGrowth.toFixed(0)}% annual growth`,
    }
  }

  // BUY: Good score
  if (overallScore >= 65) {
    const growthNote = yoyGrowth > 3 ? `${yoyGrowth.toFixed(0)}% growth momentum` : 'stable fundamentals'
    return {
      tier: 'BUY',
      headline: `Buy — Strong investment profile with ${growthNote}`,
    }
  }

  // WATCH: Decent but not compelling
  if (overallScore >= 50) {
    return {
      tier: 'WATCH',
      headline: 'Watch — Decent fundamentals, wait for better entry point or more data',
    }
  }

  // HOLD: Below average
  return {
    tier: 'HOLD',
    headline: 'Hold — Below-average returns expected, consider alternatives',
  }
}

// ─── Builders ────────────────────────────────────────────────────────────────

type GradeMap = Record<string, { score: number; label: string }>

function extractGrades(investment: InvestmentIntelligence): GradeMap {
  const map: GradeMap = {}
  const gradeFields = [
    'overallGrade', 'growthGrade', 'rentalGrade', 'liquidityGrade',
    'futureRiskGrade', 'infraGrade', 'developerGrade', 'neighborhoodGrade',
    'legalGrade',
  ] as const

  for (const field of gradeFields) {
    const grade = (investment as any)[field] as GradeDetail | undefined
    if (grade) {
      map[field] = { score: grade.score, label: grade.label }
    }
  }
  return map
}

function buildPros(grades: GradeMap, evidence: EvidenceBundle): RecommendationFactor[] {
  const pros: RecommendationFactor[] = []

  if (grades.growthGrade?.score >= 70) {
    pros.push({ factor: 'Strong Growth Potential', impact: 'HIGH', evidence: `Growth grade: ${grades.growthGrade.label} (${grades.growthGrade.score}/100)` })
  }
  if (grades.rentalGrade?.score >= 70) {
    pros.push({ factor: 'Attractive Rental Yield', impact: 'HIGH', evidence: `Rental grade: ${grades.rentalGrade.label} — ${evidence.market.rentalYield.toFixed(1)}% yield` })
  }
  if (grades.liquidityGrade?.score >= 70) {
    pros.push({ factor: 'High Liquidity', impact: 'MEDIUM', evidence: `Average ${evidence.market.avgDaysOnMarket} days to sell` })
  }
  if (grades.infraGrade?.score >= 70) {
    pros.push({ factor: 'Strong Infrastructure', impact: 'MEDIUM', evidence: `${evidence.infrastructure.nearbyMetroCount} metro stations nearby` })
  }
  if (grades.developerGrade?.score >= 70) {
    pros.push({ factor: 'Reputable Developer', impact: 'MEDIUM', evidence: `${evidence.developer.name ?? 'Developer'} — ${evidence.developer.completionRate ?? 0}% on-time delivery` })
  }
  if (evidence.comparables.pricePositionVsComparables === 'BELOW') {
    pros.push({ factor: 'Below Market Price', impact: 'HIGH', evidence: `Priced ${Math.abs(evidence.comparables.priceDeviationPct)}% below comparable median` })
  }
  if (evidence.market.marketHeat === 'HOT' || evidence.market.marketHeat === 'VERY_HOT') {
    pros.push({ factor: 'Hot Market', impact: 'MEDIUM', evidence: `Market heat: ${evidence.market.marketHeat}` })
  }

  return pros.slice(0, 6) // Max 6 pros
}

function buildCons(grades: GradeMap, evidence: EvidenceBundle): RecommendationFactor[] {
  const cons: RecommendationFactor[] = []

  if (grades.growthGrade?.score < 40) {
    cons.push({ factor: 'Limited Growth Potential', impact: 'HIGH', evidence: `Growth grade: ${grades.growthGrade.label}` })
  }
  if (grades.liquidityGrade?.score < 40) {
    cons.push({ factor: 'Low Liquidity', impact: 'HIGH', evidence: `${evidence.market.avgDaysOnMarket}+ days to sell on average` })
  }
  if (grades.futureRiskGrade?.score < 40) {
    cons.push({ factor: 'Elevated Risk Profile', impact: 'HIGH', evidence: `Risk grade: ${grades.futureRiskGrade.label}` })
  }
  if (evidence.comparables.pricePositionVsComparables === 'ABOVE') {
    cons.push({ factor: 'Above Market Price', impact: 'MEDIUM', evidence: `Priced ${evidence.comparables.priceDeviationPct}% above comparable median` })
  }
  if (evidence.market.marketHeat === 'COLD' || evidence.market.marketHeat === 'VERY_COLD') {
    cons.push({ factor: 'Cold Market', impact: 'MEDIUM', evidence: `Market heat: ${evidence.market.marketHeat} — limited buyer activity` })
  }
  if (evidence.infrastructure.nearbyMetroCount === 0) {
    cons.push({ factor: 'No Metro Access', impact: 'MEDIUM', evidence: 'No metro station within 5km' })
  }

  return cons.slice(0, 6)
}

function determineHoldingPeriod(
  grades: GradeMap,
  evidence: EvidenceBundle
): { years: number; reasoning: string } {
  const growthScore = grades.growthGrade?.score ?? 50
  const yoyGrowth = evidence.market.priceChangeYoyPct

  if (growthScore >= 80 && yoyGrowth > 8) {
    return { years: 3, reasoning: 'Strong growth momentum suggests 3-year hold for optimal returns' }
  }
  if (growthScore >= 60) {
    return { years: 5, reasoning: 'Moderate growth potential — 5-year hold recommended for full cycle benefit' }
  }
  if (growthScore >= 40) {
    return { years: 7, reasoning: 'Slower growth market — longer 7-year hold needed for meaningful appreciation' }
  }
  return { years: 10, reasoning: 'Low growth environment — 10+ year horizon or focus on rental income' }
}

function determineInvestorProfiles(
  grades: GradeMap,
  evidence: EvidenceBundle
): { suitable: InvestorProfile[]; notSuitable: string[] } {
  const suitable: InvestorProfile[] = []
  const notSuitable: string[] = []

  const rentalYield = evidence.market.rentalYield
  const growthScore = grades.growthGrade?.score ?? 50
  const riskScore = grades.futureRiskGrade?.score ?? 50

  if (rentalYield > 6) suitable.push('RENTAL_INCOME_SEEKER')
  if (growthScore >= 70) suitable.push('AGGRESSIVE_GROWTH')
  if (riskScore >= 60 && rentalYield > 4) suitable.push('CONSERVATIVE')
  if (riskScore >= 70) suitable.push('FIRST_TIME_BUYER')
  if (suitable.length === 0) suitable.push('LONG_TERM_INVESTOR')

  if (evidence.market.avgDaysOnMarket > 90) notSuitable.push('Short-term flip investor')
  if (rentalYield < 3) notSuitable.push('Income-focused investor')
  if (riskScore < 40) notSuitable.push('Risk-averse buyer')
  if (growthScore < 30) notSuitable.push('Capital appreciation seeker')

  return { suitable, notSuitable }
}

function buildWhyReasons(
  tier: RecommendationTier,
  pros: RecommendationFactor[],
  cons: RecommendationFactor[],
  evidence: EvidenceBundle
): string[] {
  const reasons: string[] = []

  if (tier === 'STRONG_BUY' || tier === 'BUY') {
    const topPros = pros.filter(p => p.impact === 'HIGH').slice(0, 2)
    reasons.push(...topPros.map(p => p.evidence))
    if (evidence.comparables.count > 10) {
      reasons.push(`Based on ${evidence.comparables.count} comparable properties`)
    }
  } else if (tier === 'AVOID' || tier === 'HIGH_RISK') {
    const topCons = cons.filter(c => c.impact === 'HIGH').slice(0, 2)
    reasons.push(...topCons.map(c => c.evidence))
    if (evidence.risks.length > 0) {
      reasons.push(`${evidence.risks.length} risk factor(s) identified`)
    }
  } else {
    reasons.push(pros.length > 0 ? pros[0].evidence : 'Mixed investment profile')
    if (cons.length > 0) reasons.push(cons[0].evidence)
  }

  return reasons.slice(0, 3)
}

function buildExitStrategy(
  grades: GradeMap,
  evidence: EvidenceBundle
): { timeline: string; approach: string; expectedReturn: string } {
  const liquidityScore = grades.liquidityGrade?.score ?? 50
  const yoyGrowth = evidence.market.priceChangeYoyPct

  if (liquidityScore >= 70) {
    return {
      timeline: '3-6 months',
      approach: 'Price at market rate for quick sale in active market',
      expectedReturn: `${(yoyGrowth * 3).toFixed(0)}–${(yoyGrowth * 5).toFixed(0)}% over 3-5 year hold`,
    }
  }
  if (liquidityScore >= 40) {
    return {
      timeline: '6-12 months',
      approach: 'List competitively and be prepared for negotiation',
      expectedReturn: `${(yoyGrowth * 5).toFixed(0)}–${(yoyGrowth * 7).toFixed(0)}% over 5-7 year hold`,
    }
  }
  return {
    timeline: '12+ months',
    approach: 'Consider rental income while waiting for optimal exit window',
    expectedReturn: 'Focus on rental yield; capital appreciation uncertain',
  }
}

function buildMarketComparison(
  overallScore: number,
  evidence: EvidenceBundle
): { comparisonToMarket: string; comparisonToCity: string } {
  const percentile = overallScore // Simplified — would compute real percentile
  const position = percentile >= 80 ? 'Top 20%' :
    percentile >= 60 ? 'Above average' :
    percentile >= 40 ? 'Average' :
    'Below average'

  return {
    comparisonToMarket: `${position} of properties in ${evidence.market.snapshot?.community ?? 'this market'}`,
    comparisonToCity: `${position} across ${evidence.market.snapshot?.city ?? 'this city'}`,
  }
}
