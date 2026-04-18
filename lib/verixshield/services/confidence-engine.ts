// ━━━ VerixShield v2.1 — Confidence Engine (7-Factor) ━━━━━━━━━━━━━━━━━━━━
// v2.1: Added Data Quality and Historical Accuracy as two new factors
// Weights rebalanced to sum to 1.0

import type {
  ComparablesResultV2,
  FusionResult,
  MLPrediction,
  DataQualityResult,
  HistoricalAccuracyResult,
  ConfidenceResult,
  ConfidenceFactor,
} from '../types-v2'

// NON-NEGOTIABLE: if zero feedback data, cap confidence at 60%
const MAX_CONFIDENCE_WITHOUT_FEEDBACK = 60

export function computeConfidenceV2(
  comparables: ComparablesResultV2,
  fusion: FusionResult,
  mlPrediction: MLPrediction,
  dataQuality: DataQualityResult,
  historicalAccuracy: HistoricalAccuracyResult,
): ConfidenceResult {
  const factors: ConfidenceFactor[] = []

  // ── Factor 1: Sample Size (0.25) ──
  let sampleScore = 0
  if (comparables.count >= 20) sampleScore = 100
  else if (comparables.count >= 10) sampleScore = 80
  else if (comparables.count >= 5) sampleScore = 60
  else if (comparables.count >= 3) sampleScore = 40
  else sampleScore = 15

  factors.push({
    name: 'Sample Size',
    score: sampleScore,
    weight: 0.25,
    weighted: Math.round(sampleScore * 0.25 * 100) / 100,
    reason: `Based on ${comparables.count} comparable properties`,
  })

  // ── Factor 2: Price Consistency (0.15) ──
  const prices = comparables.pricePerSqftDistribution
  let varianceScore = 50
  if (prices.length >= 3) {
    const mean = prices.reduce((s, v) => s + v, 0) / prices.length
    const cv =
      Math.sqrt(prices.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / prices.length) / mean

    if (cv < 0.10) varianceScore = 100
    else if (cv < 0.15) varianceScore = 85
    else if (cv < 0.25) varianceScore = 65
    else if (cv < 0.35) varianceScore = 45
    else varianceScore = 25
  }

  factors.push({
    name: 'Price Consistency',
    score: varianceScore,
    weight: 0.15,
    weighted: Math.round(varianceScore * 0.15 * 100) / 100,
    reason: varianceScore >= 70
      ? 'Prices in this area are consistent'
      : 'Prices in this area show significant variation',
  })

  // ── Factor 3: Data Freshness (0.15) ──
  let recencyScore = 50
  if (comparables.count > 0) {
    const recentComps = comparables.comparables.filter(c => c.recencyWeight > 0.7).length
    const recentRatio = recentComps / comparables.comparables.length
    recencyScore = Math.max(20, Math.min(100, Math.round(recentRatio * 100)))
  }

  factors.push({
    name: 'Data Freshness',
    score: recencyScore,
    weight: 0.15,
    weighted: Math.round(recencyScore * 0.15 * 100) / 100,
    reason: recencyScore >= 70 ? 'Recent market data (last 3 months)' : 'Some data may be older',
  })

  // ── Factor 4: Data Sources (0.10) ──
  let sourceScore = 60
  if (fusion.fusionMethod === 'weighted_blend') sourceScore = 85
  else if (fusion.fusionMethod === 'comps_only') sourceScore = 70

  factors.push({
    name: 'Data Sources',
    score: sourceScore,
    weight: 0.10,
    weighted: Math.round(sourceScore * 0.10 * 100) / 100,
    reason: 'Data from verified listing sources',
  })

  // ── Factor 5: Model Agreement (0.15) ──
  let agreementScore = 50
  if (
    fusion.fusionMethod === 'weighted_blend' &&
    comparables.weightedAvgPricePerSqft > 0 &&
    mlPrediction.predictedPricePerSqft > 0
  ) {
    const disagreement =
      Math.abs(comparables.weightedAvgPricePerSqft - mlPrediction.predictedPricePerSqft) /
      comparables.weightedAvgPricePerSqft

    if (disagreement < 0.05) agreementScore = 100
    else if (disagreement < 0.10) agreementScore = 85
    else if (disagreement < 0.20) agreementScore = 65
    else if (disagreement < 0.30) agreementScore = 45
    else agreementScore = 25
  } else if (fusion.fusionMethod === 'comps_only') {
    agreementScore = 60
  }

  factors.push({
    name: 'Model Agreement',
    score: agreementScore,
    weight: 0.15,
    weighted: Math.round(agreementScore * 0.15 * 100) / 100,
    reason: agreementScore >= 70
      ? 'Statistical and ML models agree closely'
      : 'Models show some divergence',
  })

  // ── Factor 6: Data Quality (0.10) — NEW in v2.1 ──
  factors.push({
    name: 'Data Quality',
    score: dataQuality.score,
    weight: 0.10,
    weighted: Math.round(dataQuality.score * 0.10 * 100) / 100,
    reason: dataQuality.recommendation,
  })

  // ── Factor 7: Historical Accuracy (0.10) — NEW in v2.1 ──
  factors.push({
    name: 'Historical Accuracy',
    score: historicalAccuracy.score,
    weight: 0.10,
    weighted: Math.round(historicalAccuracy.score * 0.10 * 100) / 100,
    reason: historicalAccuracy.detail,
  })

  // ── Final Score ──
  let totalScore = Math.round(factors.reduce((s, f) => s + f.weighted, 0))

  // NON-NEGOTIABLE: cap confidence if no feedback data exists
  if (!historicalAccuracy.hasData) {
    totalScore = Math.min(totalScore, MAX_CONFIDENCE_WITHOUT_FEEDBACK)
  }

  const score = Math.max(10, Math.min(100, totalScore))

  let grade: ConfidenceResult['grade'] = 'C'
  if (score >= 85) grade = 'A'
  else if (score >= 70) grade = 'B'
  else if (score >= 50) grade = 'C'
  else if (score >= 30) grade = 'D'
  else grade = 'F'

  const reasons: string[] = [`Confidence: ${score}% (Grade ${grade})`]
  factors.forEach(f => reasons.push(f.reason))

  return { score, grade, factors, reasons }
}
