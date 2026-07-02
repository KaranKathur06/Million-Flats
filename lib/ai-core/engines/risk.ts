// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Risk Scoring Engine
// Volume 3: AI/ML Pipeline — Engine: RISK
//
// Produces a multi-dimensional risk report for every property:
//   - Legal Risk (litigation, encumbrance, title clarity)
//   - Market Risk (volatility, supply glut, demand drop)
//   - Developer Risk (delay rate, reputation, financials)
//   - Structural Risk (defects, age, construction quality)
//   - Financial Risk (price deviation, overvaluation)
//   - Fraud Risk (media manipulation, duplicate listings)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { FeatureVector } from '../feature-store'
import type { EntityType, RiskScore, RiskFactor } from '../types'

const ENGINE_VERSION = '2.0.0'

interface EngineOptions {
  forceRefresh?: boolean
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runRiskEngine(
  entityId: string,
  entityType: EntityType,
  features: FeatureVector | null,
  _options: EngineOptions = {}
): Promise<RiskScore> {
  const factors: RiskFactor[] = []

  // ── Legal Risk ─────────────────────────────────────────────────────────────
  const { score: legalRisk, factors: legalFactors } = scoreLegalRisk(features)
  factors.push(...legalFactors)

  // ── Market Risk ────────────────────────────────────────────────────────────
  const { score: marketRisk, factors: marketFactors } = scoreMarketRisk(features)
  factors.push(...marketFactors)

  // ── Developer Risk ─────────────────────────────────────────────────────────
  const { score: developerRisk, factors: developerFactors } = scoreDeveloperRisk(features)
  factors.push(...developerFactors)

  // ── Structural Risk ────────────────────────────────────────────────────────
  const { score: structuralRisk, factors: structuralFactors } = scoreStructuralRisk(features)
  factors.push(...structuralFactors)

  // ── Financial Risk ────────────────────────────────────────────────────────
  const { score: financialRisk, factors: financialFactors } = scoreFinancialRisk(features)
  factors.push(...financialFactors)

  // ── Media/Fraud Risk ──────────────────────────────────────────────────────
  const { score: mediaRisk, factors: mediaFactors } = scoreMediaRisk(features)
  factors.push(...mediaFactors)

  // ── Weighted Overall Score (lower = safer) ────────────────────────────────
  const WEIGHTS = {
    legal:     0.30,   // highest weight — legal issues are most impactful
    market:    0.20,
    developer: 0.20,
    structural: 0.10,
    financial: 0.12,
    media:     0.08,
  }

  const overall = Math.round(
    legalRisk     * WEIGHTS.legal +
    marketRisk    * WEIGHTS.market +
    developerRisk * WEIGHTS.developer +
    structuralRisk * WEIGHTS.structural +
    financialRisk * WEIGHTS.financial +
    mediaRisk     * WEIGHTS.media
  )

  return {
    overall: Math.min(100, overall),
    legalRisk,
    marketRisk,
    developerRisk,
    liquidityRisk: Math.min(100, marketRisk + 10),
    mediaRisk,
    factors: factors.sort((a, b) => {
      const sev = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return sev[b.severity] - sev[a.severity]
    }),
    riskLabel: toRiskLabel(overall),
  }
}

// ─── Risk Domain Scorers ──────────────────────────────────────────────────────

function scoreLegalRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 10  // base low risk

  // Litigation
  if (features?.litigationCount && features.litigationCount > 0) {
    const severity = features.litigationCount >= 3 ? 'CRITICAL' : features.litigationCount >= 1 ? 'HIGH' : 'MEDIUM'
    factors.push({
      category: 'LEGAL',
      name: 'Active Litigation',
      severity,
      description: `${features.litigationCount} active litigation case(s) found against this property or developer`,
      mitigation: 'Engage a property lawyer to review all court cases before proceeding',
    })
    score += features.litigationCount * 20
  }

  // Encumbrance
  if (features?.hasEncumbrance === true) {
    factors.push({
      category: 'LEGAL',
      name: 'Encumbrance Detected',
      severity: 'HIGH',
      description: 'Property has an outstanding mortgage, lien, or charge',
      mitigation: 'Request full encumbrance certificate and verify all dues are cleared',
    })
    score += 25
  }

  // No RERA registration
  if (features?.reraRegistered === false && features?.reraNumber === undefined) {
    factors.push({
      category: 'LEGAL',
      name: 'Unverified RERA Status',
      severity: 'MEDIUM',
      description: 'RERA registration could not be verified for this property',
      mitigation: 'Verify RERA registration on the official portal before purchase',
    })
    score += 15
  }

  // Document incompleteness
  if (features?.documentCompletenessScore !== undefined && features.documentCompletenessScore < 50) {
    factors.push({
      category: 'LEGAL',
      name: 'Incomplete Documentation',
      severity: 'MEDIUM',
      description: `Document completeness score: ${Math.round(features.documentCompletenessScore)}%. Key documents missing.`,
      mitigation: 'Request a complete document checklist from the seller',
    })
    score += 15
  }

  return { score: Math.min(100, score), factors }
}

function scoreMarketRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 15

  // High price volatility
  if (features?.priceVolatilityScore !== undefined && features.priceVolatilityScore > 30) {
    factors.push({
      category: 'MARKET',
      name: 'High Price Volatility',
      severity: features.priceVolatilityScore > 60 ? 'HIGH' : 'MEDIUM',
      description: `Price volatility index: ${Math.round(features.priceVolatilityScore)}/100 — prices in this area fluctuate significantly`,
      mitigation: 'Purchase at a price defensible under bear-case scenario',
    })
    score += features.priceVolatilityScore * 0.5
  }

  // Oversupply
  if (features?.inventoryMonths !== undefined && features.inventoryMonths > 18) {
    factors.push({
      category: 'MARKET',
      name: 'Oversupply Detected',
      severity: features.inventoryMonths > 30 ? 'HIGH' : 'MEDIUM',
      description: `${Math.round(features.inventoryMonths)} months of inventory — market is significantly oversupplied`,
      mitigation: 'Wait for absorption rate to improve or negotiate heavily on price',
    })
    score += (features.inventoryMonths - 12) * 1.5
  }

  // Low demand
  if (features?.demandIndex !== undefined && features.demandIndex < 30) {
    factors.push({
      category: 'MARKET',
      name: 'Low Market Demand',
      severity: 'MEDIUM',
      description: `Market demand index: ${Math.round(features.demandIndex)}/100 — buyer interest is limited in this area`,
      mitigation: 'Ensure competitive pricing if planning to resell within 3 years',
    })
    score += (30 - features.demandIndex)
  }

  return { score: Math.min(100, score), factors }
}

function scoreDeveloperRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 10

  if (features?.developerDelayPct !== undefined && features.developerDelayPct > 25) {
    factors.push({
      category: 'DEVELOPER',
      name: 'High Delay Rate',
      severity: features.developerDelayPct > 50 ? 'HIGH' : 'MEDIUM',
      description: `Developer has a ${Math.round(features.developerDelayPct)}% project delay rate`,
      mitigation: 'Review RERA completion certificates for past projects. Consider penalty clauses in agreement.',
    })
    score += features.developerDelayPct * 0.8
  }

  if (features?.developerLitigationCount !== undefined && features.developerLitigationCount > 0) {
    factors.push({
      category: 'DEVELOPER',
      name: 'Developer Litigation History',
      severity: features.developerLitigationCount > 3 ? 'HIGH' : 'MEDIUM',
      description: `Developer has ${features.developerLitigationCount} litigation case(s) on record`,
      mitigation: 'Review litigation details and assess impact on project delivery',
    })
    score += features.developerLitigationCount * 15
  }

  if (features?.developerCompletionRate !== undefined && features.developerCompletionRate < 70) {
    factors.push({
      category: 'DEVELOPER',
      name: 'Low Completion Rate',
      severity: 'MEDIUM',
      description: `Developer completes only ${Math.round(features.developerCompletionRate)}% of committed projects`,
      mitigation: 'Buy from escrow-protected projects only. Verify current project RERA progress.',
    })
    score += (70 - features.developerCompletionRate) * 0.8
  }

  return { score: Math.min(100, score), factors }
}

function scoreStructuralRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 10

  if (features?.hasDefectsDetected === true) {
    factors.push({
      category: 'STRUCTURAL',
      name: 'Defects Detected in Media',
      severity: 'MEDIUM',
      description: 'AI image analysis detected possible structural issues (water damage, wall cracks, or ceiling damage)',
      mitigation: 'Arrange a physical inspection by a certified structural engineer',
    })
    score += 25
  }

  if (features?.propertyAgeYears !== undefined && features.propertyAgeYears > 25) {
    factors.push({
      category: 'STRUCTURAL',
      name: 'Aging Property',
      severity: 'LOW',
      description: `Property is approximately ${Math.round(features.propertyAgeYears)} years old`,
      mitigation: 'Inspect plumbing, electrical, and structural integrity. Budget for renovation.',
    })
    score += features.propertyAgeYears * 0.5
  }

  return { score: Math.min(100, score), factors }
}

function scoreFinancialRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 10

  // Price drop history — agent may be struggling to sell
  if (features?.priceDropCount !== undefined && features.priceDropCount > 2) {
    factors.push({
      category: 'FINANCIAL',
      name: 'Multiple Price Reductions',
      severity: 'MEDIUM',
      description: `Price has been reduced ${features.priceDropCount} times — seller may be motivated but property has low demand`,
      mitigation: 'Negotiate aggressively. Understand reason for price drops before committing.',
    })
    score += features.priceDropCount * 8
  }

  // Extended market time
  if (features?.daysOnMarket !== undefined && features.daysOnMarket > 180) {
    factors.push({
      category: 'FINANCIAL',
      name: 'Extended Market Time',
      severity: 'MEDIUM',
      description: `Property has been listed for ${features.daysOnMarket} days — significantly above market average`,
      mitigation: 'Investigate reason. Consider 10-15% lower offer to reflect stale listing.',
    })
    score += Math.min(30, (features.daysOnMarket - 60) * 0.1)
  }

  return { score: Math.min(100, score), factors }
}

function scoreMediaRisk(features: FeatureVector | null): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 0

  if (features?.aiManipulationScore !== undefined && features.aiManipulationScore > 40) {
    factors.push({
      category: 'MARKET',
      name: 'Suspicious Media Detected',
      severity: features.aiManipulationScore > 70 ? 'HIGH' : 'MEDIUM',
      description: `AI image manipulation score: ${Math.round(features.aiManipulationScore)}/100 — some photos may be digitally altered`,
      mitigation: 'Request original unedited photos and do an in-person site visit',
    })
    score += features.aiManipulationScore * 0.6
  }

  if (features?.imageDuplicateScore !== undefined && features.imageDuplicateScore > 60) {
    factors.push({
      category: 'MARKET',
      name: 'Duplicate Images Detected',
      severity: 'MEDIUM',
      description: 'Multiple property images appear to be reused from other listings',
      mitigation: 'Request fresh photos taken on-site. Cross-verify property details in person.',
    })
    score += 20
  }

  return { score: Math.min(100, score), factors }
}

// ─── Risk Label Mapping ───────────────────────────────────────────────────────

function toRiskLabel(score: number): RiskScore['riskLabel'] {
  if (score < 15) return 'VERY_LOW'
  if (score < 30) return 'LOW'
  if (score < 50) return 'MODERATE'
  if (score < 70) return 'HIGH'
  return 'VERY_HIGH'
}
