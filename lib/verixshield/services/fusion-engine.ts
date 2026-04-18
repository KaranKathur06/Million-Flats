// ━━━ VerixShield v2.1 — Fusion Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blends Comparable Engine output with ML prediction
// Core formula: Final = (Comps × W_comp) + (ML × W_ml)
// Comparables ALWAYS dominate (minimum 60% weight)

import type { ComparablesResultV2, MLPrediction, FusionResult } from '../types-v2'

const BASE_COMP_WEIGHT = 0.60
const BASE_ML_WEIGHT = 0.40

export function runFusionEngine(
  comparables: ComparablesResultV2,
  mlPrediction: MLPrediction,
  sqft: number,
): FusionResult {
  const reasons: string[] = []
  const segment = mlPrediction.modelSegment || 'fallback'

  // ── Case 1: Both sources available ──
  if (comparables.count >= 3 && mlPrediction.predictedPricePerSqft > 0) {
    const { compWeight, mlWeight } = adjustWeights(comparables, mlPrediction)

    const fusedPricePerSqft =
      comparables.timeWeightedPricePerSqft * compWeight +
      mlPrediction.predictedPricePerSqft * mlWeight

    reasons.push(
      `Blended: ${(compWeight * 100).toFixed(0)}% comparables + ${(mlWeight * 100).toFixed(0)}% ML (${segment})`,
    )
    reasons.push(`Based on ${comparables.count} comparable properties`)

    return {
      fusedPricePerSqft: Math.round(fusedPricePerSqft),
      fusedPrice: Math.round(fusedPricePerSqft * sqft),
      compWeight,
      mlWeight,
      fusionMethod: 'weighted_blend',
      fusionReasons: reasons,
      modelSegment: segment,
    }
  }

  // ── Case 2: Comparables only ──
  if (comparables.count >= 3) {
    reasons.push('ML model unavailable — using comparables only')
    reasons.push(`Based on ${comparables.count} comparable properties`)

    return {
      fusedPricePerSqft: Math.round(comparables.timeWeightedPricePerSqft),
      fusedPrice: Math.round(comparables.timeWeightedPricePerSqft * sqft),
      compWeight: 1.0,
      mlWeight: 0.0,
      fusionMethod: 'comps_only',
      fusionReasons: reasons,
      modelSegment: 'none',
    }
  }

  // ── Case 3: ML only ──
  if (mlPrediction.predictedPricePerSqft > 0) {
    reasons.push('Insufficient comparables — using ML model only')
    reasons.push('Estimate has higher uncertainty')

    return {
      fusedPricePerSqft: Math.round(mlPrediction.predictedPricePerSqft),
      fusedPrice: Math.round(mlPrediction.predictedPrice),
      compWeight: 0.0,
      mlWeight: 1.0,
      fusionMethod: 'ml_only',
      fusionReasons: reasons,
      modelSegment: segment,
    }
  }

  // ── Case 4: Heuristic fallback ──
  reasons.push('No comparables or ML data — using market heuristic')
  const heuristicPSF = computeHeuristicPSF(sqft)

  return {
    fusedPricePerSqft: Math.round(heuristicPSF),
    fusedPrice: Math.round(heuristicPSF * sqft),
    compWeight: 0,
    mlWeight: 0,
    fusionMethod: 'heuristic',
    fusionReasons: reasons,
    modelSegment: 'heuristic',
  }
}

function adjustWeights(
  comps: ComparablesResultV2,
  ml: MLPrediction,
): { compWeight: number; mlWeight: number } {
  let compWeight = BASE_COMP_WEIGHT
  let mlWeight = BASE_ML_WEIGHT

  // More comparables → trust comps more
  if (comps.count >= 20) {
    compWeight += 0.10
    mlWeight -= 0.10
  } else if (comps.count < 5) {
    compWeight -= 0.10
    mlWeight += 0.10
  }

  // High ML variance → trust comps more
  if (ml.predictedPricePerSqft > 0) {
    const coeffOfVariation = Math.sqrt(ml.predictionVariance) / ml.predictedPricePerSqft
    if (coeffOfVariation > 0.25) {
      compWeight += 0.05
      mlWeight -= 0.05
    }
  }

  // Large disagreement (>30%) → heavily favor comps (safer)
  if (comps.timeWeightedPricePerSqft > 0 && ml.predictedPricePerSqft > 0) {
    const disagreement =
      Math.abs(comps.timeWeightedPricePerSqft - ml.predictedPricePerSqft) /
      comps.timeWeightedPricePerSqft

    if (disagreement > 0.30) {
      compWeight = 0.80
      mlWeight = 0.20
    }
  }

  // Normalize
  const total = compWeight + mlWeight
  return {
    compWeight: Math.round((compWeight / total) * 100) / 100,
    mlWeight: Math.round((mlWeight / total) * 100) / 100,
  }
}

function computeHeuristicPSF(sqft: number): number {
  // Dubai market average: ~1200 AED/sqft for apartments
  if (sqft <= 500) return 1800   // studios
  if (sqft <= 1000) return 1400  // 1-2 BHK
  if (sqft <= 2000) return 1200  // 2-3 BHK
  if (sqft <= 4000) return 1000  // 3-4 BHK villas
  return 900                     // large villas
}
