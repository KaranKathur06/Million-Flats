// ━━━ VerixShield v2.1 — Distribution Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Computes P25/P50/P75 price percentile bands
// Uses empirical (≥15 pts), parametric log-normal (≥5 pts), or synthetic fallback

import type { FusionResult, ComparablesResultV2, DistributionResult } from '../types-v2'

export function computeDistribution(
  fusion: FusionResult,
  comparables: ComparablesResultV2,
  sqft: number,
): DistributionResult {
  const pricesPerSqft = comparables.pricePerSqftDistribution

  // ── Method 1: Empirical (≥15 data points) ──
  if (pricesPerSqft.length >= 15) {
    const sorted = [...pricesPerSqft].sort((a, b) => a - b)
    return {
      min: Math.round(sorted[0] * sqft),
      p10: Math.round(percentile(sorted, 0.10) * sqft),
      p25: Math.round(percentile(sorted, 0.25) * sqft),
      median: Math.round(percentile(sorted, 0.50) * sqft),
      p75: Math.round(percentile(sorted, 0.75) * sqft),
      p90: Math.round(percentile(sorted, 0.90) * sqft),
      max: Math.round(sorted[sorted.length - 1] * sqft),
      sampleSize: sorted.length,
      method: 'empirical',
    }
  }

  // ── Method 2: Parametric log-normal (≥5 data points) ──
  if (pricesPerSqft.length >= 5) {
    const logPrices = pricesPerSqft.map(p => Math.log(p))
    const mu = logPrices.reduce((s, v) => s + v, 0) / logPrices.length
    const sigma = Math.sqrt(
      logPrices.reduce((s, v) => s + Math.pow(v - mu, 2), 0) / logPrices.length,
    )

    return {
      min: Math.round(Math.exp(mu - 2.5 * sigma) * sqft),
      p10: Math.round(Math.exp(mu - 1.28 * sigma) * sqft),
      p25: Math.round(Math.exp(mu - 0.674 * sigma) * sqft),
      median: Math.round(Math.exp(mu) * sqft),
      p75: Math.round(Math.exp(mu + 0.674 * sigma) * sqft),
      p90: Math.round(Math.exp(mu + 1.28 * sigma) * sqft),
      max: Math.round(Math.exp(mu + 2.5 * sigma) * sqft),
      sampleSize: pricesPerSqft.length,
      method: 'parametric',
    }
  }

  // ── Method 3: Synthetic (from fusion price + default spread) ──
  const fusedPrice = fusion.fusedPrice
  const spreadFactor = fusion.fusionMethod === 'heuristic' ? 0.20 : 0.12

  return {
    min: Math.round(fusedPrice * (1 - spreadFactor * 2)),
    p10: Math.round(fusedPrice * (1 - spreadFactor * 1.5)),
    p25: Math.round(fusedPrice * (1 - spreadFactor)),
    median: fusedPrice,
    p75: Math.round(fusedPrice * (1 + spreadFactor)),
    p90: Math.round(fusedPrice * (1 + spreadFactor * 1.5)),
    max: Math.round(fusedPrice * (1 + spreadFactor * 2)),
    sampleSize: 0,
    method: 'synthetic',
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}
