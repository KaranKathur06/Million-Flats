// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Confidence Engine
// Volume 3: AI/ML Pipeline
//
// Every AI prediction MUST be wrapped with a confidence score.
// Never return a bare number without evidence and reasoning.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ConfidenceFactor, ConfidenceResult } from './types'

// ─── Confidence Factor Definitions ───────────────────────────────────────────
// Each factor contributes a weighted score to the final confidence percentage.

interface ConfidenceInput {
  comparablesCount: number       // How many comparable properties found
  comparablesQuality?: number    // 0-100 quality score of comparables
  dataRecency?: number           // Days since oldest data point used
  featureCompleteness?: number   // % of features populated (0-100)
  marketDataPoints?: number      // Number of market data points available
  hasGeoCoords?: boolean         // Does property have lat/lng
  modelConsensus?: number        // 0-100 agreement across model ensemble
  historicalAccuracy?: number    // 0-100 model's historical MAPE on similar properties
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const factors: ConfidenceFactor[] = []

  // ── Factor 1: Comparable Count (weight: 30%) ──────────────────────────────
  const compScore = scoreComparableCount(input.comparablesCount)
  factors.push({
    name: 'Data Sample Size',
    score: compScore,
    weight: 0.30,
    weighted: compScore * 0.30,
    reason: `${input.comparablesCount} comparable ${input.comparablesCount === 1 ? 'property' : 'properties'} found in market`,
  })

  // ── Factor 2: Comparable Quality (weight: 20%) ────────────────────────────
  const qualityScore = input.comparablesQuality ?? (compScore * 0.8)
  factors.push({
    name: 'Comparable Quality',
    score: qualityScore,
    weight: 0.20,
    weighted: qualityScore * 0.20,
    reason: qualityScore >= 70
      ? 'High-similarity comparables used (same community, similar size)'
      : qualityScore >= 50
      ? 'Moderate-similarity comparables (same city, similar type)'
      : 'Low-similarity comparables (city-level fallback)',
  })

  // ── Factor 3: Data Recency (weight: 20%) ──────────────────────────────────
  const recencyDays = input.dataRecency ?? 90
  const recencyScore = scoreDataRecency(recencyDays)
  factors.push({
    name: 'Data Freshness',
    score: recencyScore,
    weight: 0.20,
    weighted: recencyScore * 0.20,
    reason: recencyDays <= 30
      ? 'Data updated within 30 days'
      : recencyDays <= 90
      ? 'Data updated within 90 days'
      : `Data is ${recencyDays} days old — may not reflect recent market shifts`,
  })

  // ── Factor 4: Feature Completeness (weight: 15%) ──────────────────────────
  const completeness = input.featureCompleteness ?? 50
  factors.push({
    name: 'Property Data Quality',
    score: completeness,
    weight: 0.15,
    weighted: completeness * 0.15,
    reason: completeness >= 80
      ? 'Property profile is highly complete'
      : completeness >= 60
      ? 'Property profile has most key features'
      : 'Property profile is missing several important features',
  })

  // ── Factor 5: Geolocation (weight: 10%) ───────────────────────────────────
  const geoScore = input.hasGeoCoords ? 100 : 30
  factors.push({
    name: 'Location Precision',
    score: geoScore,
    weight: 0.10,
    weighted: geoScore * 0.10,
    reason: input.hasGeoCoords
      ? 'Exact coordinates available — precise distance features computed'
      : 'No GPS coordinates — using city-level distance estimates',
  })

  // ── Factor 6: Market Data Depth (weight: 5%) ──────────────────────────────
  const marketPoints = input.marketDataPoints ?? 0
  const marketScore = Math.min(100, (marketPoints / 20) * 100)
  factors.push({
    name: 'Market Data Depth',
    score: marketScore,
    weight: 0.05,
    weighted: marketScore * 0.05,
    reason: marketPoints >= 20
      ? 'Rich market transaction data available'
      : marketPoints >= 5
      ? 'Moderate market data available'
      : 'Limited market transaction data in this area',
  })

  // ── Composite Score ────────────────────────────────────────────────────────
  const totalWeighted = factors.reduce((sum, f) => sum + f.weighted, 0)
  const score = Math.round(Math.min(100, Math.max(0, totalWeighted)))

  const grade = score >= 85 ? 'A'
    : score >= 70 ? 'B'
    : score >= 55 ? 'C'
    : score >= 40 ? 'D'
    : 'F'

  // ── Top Reasons ───────────────────────────────────────────────────────────
  const reasons: string[] = []
  if (input.comparablesCount >= 10) {
    reasons.push(`Based on ${input.comparablesCount} comparable sales and listings`)
  }
  if (recencyDays <= 30) {
    reasons.push('Market data refreshed within the last 30 days')
  }
  if (completeness >= 80) {
    reasons.push('Property profile is highly complete')
  }
  if (score < 60) {
    reasons.push('Additional market data would improve prediction accuracy')
  }

  return {
    score,
    grade,
    factors,
    dataPointsUsed: input.comparablesCount + (input.marketDataPoints ?? 0),
    lastDataUpdate: new Date().toISOString(),
    reasons,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreComparableCount(count: number): number {
  if (count >= 50) return 100
  if (count >= 20) return 90
  if (count >= 10) return 80
  if (count >= 5)  return 65
  if (count >= 3)  return 50
  if (count >= 1)  return 30
  return 10
}

function scoreDataRecency(days: number): number {
  if (days <= 7)   return 100
  if (days <= 30)  return 90
  if (days <= 60)  return 75
  if (days <= 90)  return 60
  if (days <= 180) return 40
  if (days <= 365) return 20
  return 5
}

// ─── Confidence Guard ─────────────────────────────────────────────────────────
// Use this to gate whether we should show an AI result or surface "insufficient data"

export function hasMinimumConfidence(result: ConfidenceResult, threshold = 40): boolean {
  return result.score >= threshold
}

export function confidenceLabel(score: number): string {
  if (score >= 85) return 'Very High'
  if (score >= 70) return 'High'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Very Low'
}
