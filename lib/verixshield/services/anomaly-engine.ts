// ━━━ VerixShield v2.1 — Anomaly Detection Engine ━━━━━━━━━━━━━━━━━━━━━━━━
// Classifies asking price vs fair value using MVI-driven dynamic thresholds
// Replaces v1's static ±15%/±30% thresholds

import type {
  FusionResult,
  DistributionResult,
  ComparablesResultV2,
  ConfidenceResult,
  MVIResult,
  AnomalyResult,
  VerixShieldStatusV2,
} from '../types-v2'

export function detectAnomalies(
  askingPrice: number | null,
  fusion: FusionResult,
  distribution: DistributionResult,
  comparables: ComparablesResultV2,
  confidence: ConfidenceResult,
  mvi: MVIResult,
): AnomalyResult {
  const fairValue = fusion.fusedPrice
  const dynamicThreshold = mvi.effectiveThreshold

  // ── No asking price ──
  if (!askingPrice || askingPrice <= 0) {
    return {
      status: 'FAIR',
      deviation: 0,
      pricePosition: 50,
      dynamicThreshold,
      flags: ['No asking price available for comparison'],
      suggestedMinPrice: distribution.p25,
      suggestedMaxPrice: distribution.p75,
    }
  }

  // ── Compute deviation ──
  const deviation = fairValue > 0 ? ((askingPrice - fairValue) / fairValue) * 100 : 0

  // ── Classify ──
  let status: VerixShieldStatusV2 = 'FAIR'
  const flags: string[] = []

  if (deviation > dynamicThreshold) {
    status = 'ABOVE_MARKET'
    flags.push(`Asking price is ${deviation.toFixed(1)}% above fair market value`)
    flags.push(`Market threshold: ±${dynamicThreshold.toFixed(0)}% (${mvi.classification} market)`)
  } else if (deviation < -dynamicThreshold * 2) {
    status = 'HIGH_RISK'
    flags.push(`Price is ${Math.abs(deviation).toFixed(1)}% below market — exercise caution`)
    flags.push('Unusually low price may indicate issues with the listing')
  } else if (deviation < -dynamicThreshold) {
    status = 'UNDERPRICED'
    flags.push(`Price is ${Math.abs(deviation).toFixed(1)}% below market — potential opportunity`)
  } else {
    status = 'FAIR'
    flags.push('Price aligns with market estimates')
    if (Math.abs(deviation) < 5) {
      flags.push('Strong alignment — asking price is very close to fair value')
    }
  }

  // ── Price position (percentile) ──
  let pricePosition = 50
  if (comparables.pricePerSqftDistribution.length > 0 && fusion.fusedPricePerSqft > 0) {
    const askingPSF = askingPrice / (fusion.fusedPrice / fusion.fusedPricePerSqft)
    const sorted = [...comparables.pricePerSqftDistribution].sort((a, b) => a - b)
    const belowCount = sorted.filter(p => p <= askingPSF).length
    pricePosition = Math.round((belowCount / sorted.length) * 100)
  }
  pricePosition = Math.max(0, Math.min(100, pricePosition))

  // ── Confidence adjustment ──
  if (confidence.score < 40) {
    flags.push('Low confidence data — use estimate as a guide only')
  }

  if (fusion.fusionMethod === 'heuristic') {
    status = 'INSUFFICIENT_DATA'
    flags.push('No comparable data — showing heuristic estimate only')
  }

  return {
    status,
    deviation: Math.round(deviation * 100) / 100,
    pricePosition,
    dynamicThreshold,
    flags,
    suggestedMinPrice: Math.round(distribution.p25 * 0.98),
    suggestedMaxPrice: Math.round(distribution.median * 1.02),
  }
}
