// ━━━ VerixShield v2.1 — Explanation Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generates structured, human-readable explanations for every estimate
// Shows users WHY a price was computed, not just WHAT

import type {
  FusionResult,
  ComparablesResultV2,
  ConfidenceResult,
  AnomalyResult,
  DistributionResult,
  DataQualityResult,
  DemandIntelligenceResult,
  NormalizationFactors,
  ExplanationResult,
  ExplanationFactor,
} from '../types-v2'

export function generateExplanation(
  fusion: FusionResult,
  comparables: ComparablesResultV2,
  confidence: ConfidenceResult,
  anomaly: AnomalyResult,
  distribution: DistributionResult,
  dataQuality: DataQualityResult,
  demand: DemandIntelligenceResult,
  normFactors: NormalizationFactors,
): ExplanationResult {
  const compCount = comparables.count
  const timeRange = 'last 6 months'
  const medianPSF = comparables.medianPricePerSqft

  // ── Summary ──
  let summary = ''
  switch (anomaly.status) {
    case 'FAIR':
      summary = `Based on ${compCount} similar properties in this area over the ${timeRange}, this property is fairly priced. The median price per sq.ft in this neighborhood is AED ${medianPSF.toLocaleString()}.`
      break
    case 'ABOVE_MARKET':
      summary = `Analysis of ${compCount} comparable properties suggests this listing is priced ${Math.abs(anomaly.deviation).toFixed(1)}% above the market average. Consider negotiating toward AED ${anomaly.suggestedMaxPrice.toLocaleString()}.`
      break
    case 'UNDERPRICED':
      summary = `This property appears to be priced ${Math.abs(anomaly.deviation).toFixed(1)}% below the market value based on ${compCount} comparable listings. This could be a strong buying opportunity.`
      break
    case 'HIGH_RISK':
      summary = `The asking price is significantly below market value (${Math.abs(anomaly.deviation).toFixed(1)}% below). Exercise caution and verify listing details before proceeding.`
      break
    default:
      summary = 'Insufficient data to provide a detailed valuation explanation.'
      break
  }

  // ── Methodology ──
  let methodology = 'Heuristic estimates'
  if (fusion.fusionMethod === 'weighted_blend') {
    methodology = `Hybrid analysis: ${(fusion.compWeight * 100).toFixed(0)}% comparable-based + ${(fusion.mlWeight * 100).toFixed(0)}% ML prediction (${fusion.modelSegment})`
  } else if (fusion.fusionMethod === 'comps_only') {
    methodology = 'Comparable properties analysis'
  }

  // ── Key Factors ──
  const keyFactors: ExplanationFactor[] = [
    {
      icon: '🏘️',
      label: 'Comparable Properties',
      value: `${compCount} similar properties analyzed`,
      impact: compCount >= 10 ? 'positive' : compCount >= 5 ? 'neutral' : 'negative',
    },
    {
      icon: '📊',
      label: 'Median Price/sqft',
      value: `AED ${medianPSF.toLocaleString()}/sqft`,
      impact: 'neutral',
    },
    {
      icon: '🎯',
      label: 'Confidence Level',
      value: `${confidence.score}% (Grade ${confidence.grade})`,
      impact: confidence.score >= 70 ? 'positive' : confidence.score >= 50 ? 'neutral' : 'negative',
    },
    {
      icon: '📈',
      label: 'Data Quality',
      value: `${dataQuality.status} confidence data`,
      impact: dataQuality.status === 'HIGH' ? 'positive' : dataQuality.status === 'MEDIUM' ? 'neutral' : 'negative',
    },
    {
      icon: '🔥',
      label: 'Demand Level',
      value: demand.level,
      impact: demand.level === 'HOT' ? 'positive' : demand.level === 'COLD' ? 'negative' : 'neutral',
    },
  ]

  // Add normalization factors if significant
  if (normFactors.compositeFactor > 1.05 || normFactors.compositeFactor < 0.95) {
    keyFactors.push({
      icon: '🏗️',
      label: 'Property Adjustments',
      value: `×${normFactors.compositeFactor.toFixed(2)} (floor, view, developer)`,
      impact: normFactors.compositeFactor > 1.0 ? 'positive' : 'negative',
    })
  }

  return {
    summary,
    dataPoints: compCount + (fusion.fusionMethod === 'weighted_blend' ? 1 : 0),
    timeRange,
    medianPricePerSqft: medianPSF,
    methodology,
    keyFactors,
    disclaimer:
      'This is an automated estimate for informational purposes. Actual property values may vary. Consult a professional for precise valuation.',
  }
}
