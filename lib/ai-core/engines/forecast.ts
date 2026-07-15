// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Forecast Engine
// Phase 11: Forecast Engine (Wave 1)
//
// Explainable projections with RANGES, never false precision.
// Every forecast shows min/base/max with confidence intervals.
//
// Outputs:
//   - Appreciation forecasts (12M, 24M, 36M)
//   - Rental growth projections
//   - Optimal holding period
//   - Exit windows
//   - Market momentum classification
//   - 3 scenarios (bull, base, bear)
//   - AI Timeline (past → present → forecast → future)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { EvidenceBundle } from './evidence'
import type { FeatureVector } from '../types'

// ─── Forecast Result ─────────────────────────────────────────────────────────

export interface ForecastResult {
  /** Capital appreciation projections at multiple horizons */
  appreciation: AppreciationForecast[]

  /** Rental growth projections */
  rentalGrowth: {
    min: number                    // Annual % (pessimistic)
    base: number                   // Annual % (expected)
    max: number                    // Annual % (optimistic)
    confidence: number             // 0-100
  }

  /** Optimal holding period */
  holdingPeriod: {
    optimal: number                // Years
    reasoning: string
  }

  /** Exit potential scoring */
  exitPotential: {
    score: number                  // 0-100
    windows: ExitWindow[]
  }

  /** Market momentum classification */
  marketMomentum: MarketMomentum

  /** Three scenarios: bull, base, bear */
  scenarios: {
    bull: Scenario
    base: Scenario
    bear: Scenario
  }

  /** AI Timeline — past to future with events */
  timeline: TimelineEntry[]

  /** Methodology explanation */
  methodology: string

  /** Overall forecast confidence */
  confidence: number
}

export interface AppreciationForecast {
  period: '12M' | '24M' | '36M'
  min: number                      // % appreciation (pessimistic)
  base: number                     // % appreciation (expected)
  max: number                      // % appreciation (optimistic)
  confidence: number               // 0-100
}

export interface ExitWindow {
  period: string                   // "2025-Q2", "2026-H1"
  favorability: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  reasoning: string
}

export type MarketMomentum =
  | 'ACCELERATING'
  | 'STABLE'
  | 'DECELERATING'
  | 'BOTTOMING'

export interface Scenario {
  name: string
  probability: number              // 0-100
  totalReturn: number              // % over holding period
  annualizedReturn: number         // % per year
  description: string
  assumptions: string[]
}

export interface TimelineEntry {
  date: string                     // "2021-Q1", "2024-07", "2027-Q2"
  type: 'HISTORICAL' | 'CURRENT' | 'FORECAST'
  pricePerSqft?: number
  priceChangePct?: number
  event?: string                   // "Metro line opened", "New supply launched"
  confidence?: number              // 0-100 for forecasts
}

// ─── Generate Forecast ───────────────────────────────────────────────────────

/**
 * Generate explainable forecasts for a property based on evidence.
 * Uses evidence-based projections, NOT ML predictions (those come from the ML sidecar).
 */
export function generateForecast(
  features: FeatureVector,
  evidence: EvidenceBundle
): ForecastResult {
  const market = evidence.market
  const snapshot = market.snapshot

  // ── Base parameters from evidence ──────────────────────────────────────────
  const historicalGrowth = market.priceChangeYoyPct || 5 // Default 5% if no data
  const rentalYield = market.rentalYield || 5
  const heatIndex = snapshot?.marketHeatIndex ?? 50
  const demandSupply = market.demandSupplyRatio
  const infraScore = evidence.infrastructure.connectivityScore

  // ── Growth momentum factor ─────────────────────────────────────────────────
  const momentumFactor = computeMomentumFactor(
    market.priceChangeYoyPct,
    snapshot?.priceChangeQoqPct ?? 0,
    snapshot?.priceChangeMomPct ?? 0,
    heatIndex
  )

  // ── Appreciation forecasts ─────────────────────────────────────────────────
  const appreciation = generateAppreciation(historicalGrowth, momentumFactor, infraScore)

  // ── Rental growth ──────────────────────────────────────────────────────────
  const rentalGrowth = {
    min: Math.round((rentalYield * 0.8 - 1) * 100) / 100,
    base: Math.round((rentalYield * 0.9) * 100) / 100,
    max: Math.round((rentalYield * 1.1 + 1) * 100) / 100,
    confidence: evidence.stats.totalDataPoints > 30 ? 70 : 50,
  }

  // ── Holding period ─────────────────────────────────────────────────────────
  const holdingPeriod = determineOptimalHold(historicalGrowth, momentumFactor, rentalYield)

  // ── Exit potential ─────────────────────────────────────────────────────────
  const exitPotential = computeExitPotential(heatIndex, demandSupply, momentumFactor)

  // ── Market momentum ────────────────────────────────────────────────────────
  const marketMomentum = classifyMomentum(momentumFactor)

  // ── Scenarios ──────────────────────────────────────────────────────────────
  const scenarios = buildScenarios(
    appreciation,
    rentalYield,
    holdingPeriod.optimal,
    momentumFactor
  )

  // ── Timeline ───────────────────────────────────────────────────────────────
  const timeline = buildTimeline(features, evidence, appreciation)

  // ── Confidence ─────────────────────────────────────────────────────────────
  const confidence = Math.round(
    (evidence.quality.overall * 0.4) +
    (evidence.stats.totalDataPoints > 50 ? 30 : evidence.stats.totalDataPoints > 20 ? 20 : 10) +
    (evidence.comparables.count > 10 ? 20 : evidence.comparables.count > 5 ? 15 : 5) +
    (snapshot ? 10 : 0)
  )

  return {
    appreciation,
    rentalGrowth,
    holdingPeriod,
    exitPotential,
    marketMomentum,
    scenarios,
    timeline,
    methodology: buildMethodology(evidence),
    confidence: Math.min(100, confidence),
  }
}

// ─── Internal: Appreciation ──────────────────────────────────────────────────

function generateAppreciation(
  historicalGrowth: number,
  momentumFactor: number,
  infraScore: number
): AppreciationForecast[] {
  const infraBonus = infraScore > 70 ? 1.5 : infraScore > 40 ? 0.5 : 0
  const baseGrowth = historicalGrowth * momentumFactor + infraBonus

  return [
    {
      period: '12M',
      min: Math.round((baseGrowth * 0.5) * 10) / 10,
      base: Math.round(baseGrowth * 10) / 10,
      max: Math.round((baseGrowth * 1.5) * 10) / 10,
      confidence: 65,
    },
    {
      period: '24M',
      min: Math.round((baseGrowth * 0.8) * 10) / 10,
      base: Math.round((baseGrowth * 1.9) * 10) / 10,
      max: Math.round((baseGrowth * 2.8) * 10) / 10,
      confidence: 55,
    },
    {
      period: '36M',
      min: Math.round((baseGrowth * 1.0) * 10) / 10,
      base: Math.round((baseGrowth * 2.7) * 10) / 10,
      max: Math.round((baseGrowth * 4.0) * 10) / 10,
      confidence: 45,
    },
  ]
}

// ─── Internal: Momentum ──────────────────────────────────────────────────────

function computeMomentumFactor(
  yoy: number, qoq: number, mom: number, heatIndex: number
): number {
  // Weight recent data more heavily
  const trendScore = mom * 0.4 + qoq * 0.35 + yoy * 0.25

  // Adjust for market heat
  const heatAdjustment = (heatIndex - 50) / 100

  // Momentum factor: 1.0 = stable, >1 = accelerating, <1 = decelerating
  const raw = 1 + (trendScore / 100) + heatAdjustment * 0.2
  return Math.max(0.3, Math.min(2.0, raw))
}

function classifyMomentum(factor: number): MarketMomentum {
  if (factor >= 1.3) return 'ACCELERATING'
  if (factor >= 0.9) return 'STABLE'
  if (factor >= 0.6) return 'DECELERATING'
  return 'BOTTOMING'
}

// ─── Internal: Holding Period ────────────────────────────────────────────────

function determineOptimalHold(
  growth: number, momentum: number, yield_: number
): { optimal: number; reasoning: string } {
  const adjustedGrowth = growth * momentum

  if (adjustedGrowth > 10 && yield_ > 5) {
    return { optimal: 3, reasoning: 'Strong growth + yield suggests shorter 3-year hold for optimal risk-adjusted returns' }
  }
  if (adjustedGrowth > 5) {
    return { optimal: 5, reasoning: 'Healthy growth trajectory supports standard 5-year investment cycle' }
  }
  if (yield_ > 6) {
    return { optimal: 7, reasoning: 'Strong rental yield compensates for moderate growth — 7-year hold for income accumulation' }
  }
  return { optimal: 10, reasoning: 'Lower growth environment — 10-year horizon recommended for meaningful total returns' }
}

// ─── Internal: Exit Potential ────────────────────────────────────────────────

function computeExitPotential(
  heatIndex: number, demandSupply: number, momentum: number
): { score: number; windows: ExitWindow[] } {
  const score = Math.round(
    heatIndex * 0.4 +
    Math.min(100, demandSupply * 50) * 0.3 +
    momentum * 30 * 0.3
  )

  const year = new Date().getFullYear()
  const windows: ExitWindow[] = []

  if (score >= 70) {
    windows.push({
      period: `${year + 1}-H1`,
      favorability: 'GOOD',
      reasoning: 'Active market with strong demand',
    })
  }

  windows.push({
    period: `${year + 2}-Q2`,
    favorability: score >= 60 ? 'EXCELLENT' : 'GOOD',
    reasoning: 'Optimal cycle position after appreciation',
  })

  windows.push({
    period: `${year + 3}-${year + 5}`,
    favorability: momentum >= 1 ? 'EXCELLENT' : 'FAIR',
    reasoning: momentum >= 1 ? 'Full cycle completion with growth momentum' : 'Extended hold for cycle recovery',
  })

  return { score: Math.min(100, Math.max(0, score)), windows }
}

// ─── Internal: Scenarios ─────────────────────────────────────────────────────

function buildScenarios(
  appreciation: AppreciationForecast[],
  rentalYield: number,
  holdYears: number,
  momentum: number
): { bull: Scenario; base: Scenario; bear: Scenario } {
  const baseAppreciation = appreciation.find(a => a.period === '36M')?.base ?? 10
  const annualRental = rentalYield

  return {
    bull: {
      name: 'Bull Case',
      probability: momentum >= 1.2 ? 35 : 20,
      totalReturn: Math.round((baseAppreciation * 1.5 + annualRental * holdYears) * 10) / 10,
      annualizedReturn: Math.round(((baseAppreciation * 1.5 / holdYears) + annualRental) * 10) / 10,
      description: 'Strong market growth with infrastructure catalysts',
      assumptions: [
        'Market growth continues above historical average',
        'Infrastructure projects complete on schedule',
        'Demand remains strong in this segment',
      ],
    },
    base: {
      name: 'Base Case',
      probability: 50,
      totalReturn: Math.round((baseAppreciation + annualRental * holdYears) * 10) / 10,
      annualizedReturn: Math.round(((baseAppreciation / holdYears) + annualRental) * 10) / 10,
      description: 'Continuation of current market trends',
      assumptions: [
        'Market grows at historical average rate',
        'Rental demand remains stable',
        'No major economic disruptions',
      ],
    },
    bear: {
      name: 'Bear Case',
      probability: momentum < 0.8 ? 35 : 15,
      totalReturn: Math.round((baseAppreciation * 0.3 + annualRental * holdYears * 0.8) * 10) / 10,
      annualizedReturn: Math.round(((baseAppreciation * 0.3 / holdYears) + annualRental * 0.8) * 10) / 10,
      description: 'Market correction or economic slowdown',
      assumptions: [
        'Market correction of 10-15%',
        'Rental yields compress by 20%',
        'Extended absorption period for new supply',
      ],
    },
  }
}

// ─── Internal: Timeline ──────────────────────────────────────────────────────

function buildTimeline(
  features: FeatureVector,
  evidence: EvidenceBundle,
  appreciation: AppreciationForecast[]
): TimelineEntry[] {
  const timeline: TimelineEntry[] = []
  const currentYear = new Date().getFullYear()
  const currentPPS = features.pricePerSqft ?? evidence.market.snapshot?.avgPricePerSqft ?? 0

  // Historical entries (simulated from YoY growth)
  const yoyGrowth = evidence.market.priceChangeYoyPct || 5
  for (let i = 3; i >= 1; i--) {
    const historicalPPS = currentPPS / Math.pow(1 + yoyGrowth / 100, i)
    timeline.push({
      date: `${currentYear - i}`,
      type: 'HISTORICAL',
      pricePerSqft: Math.round(historicalPPS),
      priceChangePct: yoyGrowth,
    })
  }

  // Current position
  timeline.push({
    date: `${currentYear}`,
    type: 'CURRENT',
    pricePerSqft: Math.round(currentPPS),
    event: `Current: ${features.community ?? features.city ?? 'Market'}`,
  })

  // Forecast entries
  for (const forecast of appreciation) {
    const months = parseInt(forecast.period)
    const forecastYear = currentYear + Math.ceil(months / 12)
    const forecastPPS = currentPPS * (1 + forecast.base / 100)

    timeline.push({
      date: `${forecastYear}`,
      type: 'FORECAST',
      pricePerSqft: Math.round(forecastPPS),
      priceChangePct: forecast.base,
      confidence: forecast.confidence,
    })
  }

  // Add infrastructure events
  for (const project of evidence.infrastructure.upcomingProjects.slice(0, 2)) {
    const eventYear = currentYear + Math.ceil((project.timelineMonths ?? 24) / 12)
    const existingEntry = timeline.find(t => t.date === `${eventYear}`)
    if (existingEntry) {
      existingEntry.event = project.name
    } else {
      timeline.push({
        date: `${eventYear}`,
        type: 'FORECAST',
        event: project.name,
        confidence: 60,
      })
    }
  }

  // Sort by date
  timeline.sort((a, b) => a.date.localeCompare(b.date))

  return timeline
}

// ─── Internal: Methodology ───────────────────────────────────────────────────

function buildMethodology(evidence: EvidenceBundle): string {
  const parts: string[] = ['Evidence-based forecast using:']

  if (evidence.comparables.count > 0) {
    parts.push(`${evidence.comparables.count} comparable properties`)
  }
  if (evidence.market.snapshot) {
    parts.push('pre-computed market snapshot metrics')
  }
  if (evidence.infrastructure.upcomingProjects.length > 0) {
    parts.push(`${evidence.infrastructure.upcomingProjects.length} infrastructure impact(s)`)
  }

  parts.push('Projections show ranges (min/base/max) to avoid false precision.')
  parts.push('Confidence decreases with longer time horizons.')

  return parts.join(' ')
}
