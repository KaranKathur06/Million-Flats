// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AIIndex Investment Engine
// Volume 3: AI/ML Pipeline — Engine: INDEX
//
// Scores every property across 15 investment dimensions and produces:
//   - Overall Investment Grade (A+ to D)
//   - Opportunity Score (right now vs later)
//   - CAGR Projections (3 scenarios)
//   - Rental Yield & Cashflow Intelligence
//   - Infrastructure Impact Analysis
//   - Exit Strategy Recommendation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import { computeConfidence } from '../confidence'
import type { FeatureVector } from '../feature-store'
import type {
  EntityType,
  InvestmentIntelligence,
  GradeDetail,
  InvestmentGrade,
  FeatureImportance,
} from '../types'

const ENGINE_VERSION = '2.0.0'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface EngineOptions {
  forceRefresh?: boolean
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runInvestmentEngine(
  entityId: string,
  entityType: EntityType,
  features: FeatureVector | null,
  options: EngineOptions = {}
): Promise<InvestmentIntelligence | null> {
  const startTime = Date.now()

  // ── Load supplementary data ───────────────────────────────────────────────
  const { nearbyInfra, askingPrice, city, community, countryIso2, sqft } =
    await loadSupplementaryData(entityId, entityType)

  // ── Score all 9 investment dimensions ────────────────────────────────────
  const rentalGrade = scoreRentalYield(features)
  const growthGrade = scoreGrowthPotential(features, nearbyInfra)
  const liquidityGrade = scoreLiquidity(features)
  const infrastructureGrade = scoreInfrastructure(features, nearbyInfra)
  const demandGrade = scoreDemand(features)
  const developerGrade = scoreDeveloper(features)
  const neighborhoodGrade = scoreNeighborhood(features)
  const futureRiskGrade = scoreFutureRisk(features)
  const legalGrade = scoreLegal(features)

  // ── Weighted overall grade ────────────────────────────────────────────────
  const WEIGHTS = {
    rental:         0.12,
    growth:         0.18,
    liquidity:      0.10,
    infrastructure: 0.12,
    demand:         0.12,
    developer:      0.10,
    neighborhood:   0.08,
    futureRisk:     0.10,
    legal:          0.08,
  }

  const weightedScore = Math.round(
    rentalGrade.score * WEIGHTS.rental +
    growthGrade.score * WEIGHTS.growth +
    liquidityGrade.score * WEIGHTS.liquidity +
    infrastructureGrade.score * WEIGHTS.infrastructure +
    demandGrade.score * WEIGHTS.demand +
    developerGrade.score * WEIGHTS.developer +
    neighborhoodGrade.score * WEIGHTS.neighborhood +
    futureRiskGrade.score * WEIGHTS.futureRisk +
    legalGrade.score * WEIGHTS.legal
  )

  const overallGrade = toGrade(weightedScore)

  // ── Financial projections ─────────────────────────────────────────────────
  const rentalYield = features?.rentalYieldArea ?? 5.5
  const projectedCAGR = computeCAGR(features, nearbyInfra)
  const capitalAppreciation = projectedCAGR.base * 5

  // ── Opportunity score ─────────────────────────────────────────────────────
  // High score = great time to buy RIGHT NOW (vs holding off)
  const opportunityScore = computeOpportunityScore(features, nearbyInfra, overallGrade.grade)

  // ── Strategy recommendation ───────────────────────────────────────────────
  const { strategy, strategyReasoning, bestHoldingPeriod } = computeStrategy(
    rentalYield, weightedScore, features
  )

  // ── Exit potential ────────────────────────────────────────────────────────
  const exitPotential = computeExitPotential(features, liquidityGrade.score)

  // ── Key factors & risks ───────────────────────────────────────────────────
  const topFactors = computeTopFactors(features, nearbyInfra, rentalGrade, growthGrade)

  // ── Confidence ───────────────────────────────────────────────────────────
  const confidence = computeConfidence({
    comparablesCount: 5,  // placeholder
    featureCompleteness: features?.completeness,
    hasGeoCoords: Boolean(features?.latitude && features?.longitude),
    marketDataPoints: 20,
  })

  return {
    entityId,
    entityType,
    overallGrade,
    opportunityScore,
    rentalGrade,
    growthGrade,
    liquidityGrade,
    infrastructureGrade,
    demandGrade,
    developerGrade,
    neighborhoodGrade,
    futureRiskGrade,
    legalGrade,
    projectedCAGR,
    cashflowScore: Math.min(100, Math.round(rentalYield * 12)),
    rentalYield,
    rentalOccupancy: computeOccupancy(features),
    vacancyRisk: features?.vacancyRateArea
      ? features.vacancyRateArea > 20 ? 'HIGH' : features.vacancyRateArea > 10 ? 'MEDIUM' : 'LOW'
      : 'MEDIUM',
    capitalAppreciation,
    inflationAdjustedReturn: Math.max(0, projectedCAGR.base - 3.5),
    exitPotential,
    bestHoldingPeriod,
    investmentStrategy: strategy,
    strategyReasoning,
    nearbyInfrastructure: nearbyInfra.slice(0, 5),
    topInvestmentFactors: topFactors,
    keyRisks: computeInvestmentRisks(features, rentalYield),
    confidence,
    modelVersion: ENGINE_VERSION,
    computedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    cacheHit: false,
  }
}

// ─── Investment Dimension Scorers ─────────────────────────────────────────────

function scoreRentalYield(features: FeatureVector | null): GradeDetail {
  const yield_ = features?.rentalYieldArea ?? 4.0
  const score = Math.min(100, Math.round((yield_ / 10) * 100))
  return {
    grade: toGradeSymbol(score),
    score,
    label: yield_ >= 8 ? 'Excellent' : yield_ >= 6 ? 'Good' : yield_ >= 4 ? 'Average' : 'Below Average',
    reasoning: `Area average rental yield: ${yield_.toFixed(1)}%`,
  }
}

function scoreGrowthPotential(
  features: FeatureVector | null,
  infra: InfrastructureRecord[]
): GradeDetail {
  let score = 50
  if (features?.avgAppreciationPct) score = Math.min(100, (features.avgAppreciationPct / 15) * 100)
  if (features?.demandIndex && features.demandIndex > 70) score = Math.min(100, score + 10)

  // Infrastructure boost
  const infraBoost = infra.filter(i => i.status === 'UNDER_CONSTRUCTION' || i.status === 'APPROVED').length * 5
  score = Math.min(100, score + infraBoost)

  return {
    grade: toGradeSymbol(score),
    score: Math.round(score),
    label: score >= 80 ? 'Excellent Growth' : score >= 60 ? 'Good Growth' : 'Moderate Growth',
    reasoning: `3-year area appreciation ${features?.avgAppreciationPct?.toFixed(1) ?? 'N/A'}% CAGR${infra.length > 0 ? ` + ${infra.length} infrastructure projects nearby` : ''}`,
  }
}

function scoreLiquidity(features: FeatureVector | null): GradeDetail {
  const invMonths = features?.inventoryMonths ?? 12
  const score = Math.min(100, Math.max(0, Math.round(100 - invMonths * 5)))
  return {
    grade: toGradeSymbol(score),
    score,
    label: invMonths <= 6 ? 'High Liquidity' : invMonths <= 12 ? 'Moderate' : 'Low Liquidity',
    reasoning: `${invMonths.toFixed(1)} months of supply in this area`,
  }
}

function scoreInfrastructure(
  features: FeatureVector | null,
  infra: InfrastructureRecord[]
): GradeDetail {
  let score = 50
  if (features?.distanceMetroKm !== undefined) {
    if (features.distanceMetroKm < 0.5) score = 95
    else if (features.distanceMetroKm < 1) score = 85
    else if (features.distanceMetroKm < 2) score = 70
    else if (features.distanceMetroKm < 5) score = 55
    else score = 35
  }

  // Upcoming infrastructure bonus
  const upcoming = infra.filter(i => i.status !== 'COMPLETED' && i.status !== 'CANCELLED').length
  score = Math.min(100, score + upcoming * 5)

  return {
    grade: toGradeSymbol(score),
    score: Math.round(score),
    label: score >= 80 ? 'Excellent Connectivity' : score >= 60 ? 'Good Connectivity' : 'Limited Connectivity',
    reasoning: `${features?.distanceMetroKm?.toFixed(1) ?? 'N/A'} km to metro. ${infra.length} infrastructure projects nearby.`,
  }
}

function scoreDemand(features: FeatureVector | null): GradeDetail {
  const demand = features?.demandIndex ?? 50
  return {
    grade: toGradeSymbol(demand),
    score: Math.round(demand),
    label: demand >= 80 ? 'Very High Demand' : demand >= 60 ? 'High Demand' : demand >= 40 ? 'Moderate Demand' : 'Low Demand',
    reasoning: `Market demand index: ${Math.round(demand)}/100`,
  }
}

function scoreDeveloper(features: FeatureVector | null): GradeDetail {
  const score = features?.developerReputationScore ?? 50
  return {
    grade: toGradeSymbol(score),
    score: Math.round(score),
    label: score >= 80 ? 'Top Developer' : score >= 60 ? 'Reliable Developer' : 'Average Developer',
    reasoning: `Developer reputation: ${Math.round(score)}/100. Completion rate: ${features?.developerCompletionRate?.toFixed(0) ?? 'N/A'}%`,
  }
}

function scoreNeighborhood(features: FeatureVector | null): GradeDetail {
  let score = 60
  if (features?.walkScore) score = features.walkScore
  if (features?.connectivityScore) score = Math.round((score + features.connectivityScore) / 2)
  if (features?.pollutionIndex && features.pollutionIndex > 70) score -= 15
  if (features?.floodRiskScore && features.floodRiskScore > 50) score -= 10

  return {
    grade: toGradeSymbol(score),
    score: Math.min(100, Math.max(0, Math.round(score))),
    label: score >= 80 ? 'Premium Neighborhood' : score >= 60 ? 'Good Neighborhood' : 'Average Area',
    reasoning: `Walk score: ${features?.walkScore ?? 'N/A'}, Connectivity: ${features?.connectivityScore ?? 'N/A'}`,
  }
}

function scoreFutureRisk(features: FeatureVector | null): GradeDetail {
  let riskScore = 30
  if (features?.priceVolatilityScore) riskScore = Math.min(100, features.priceVolatilityScore)
  if (features?.litigationCount && features.litigationCount > 0) riskScore += 20
  if (features?.hasEncumbrance) riskScore += 15
  if (features?.developerDelayPct && features.developerDelayPct > 30) riskScore += 15

  const safetyScore = Math.max(0, 100 - riskScore)
  return {
    grade: toGradeSymbol(safetyScore),
    score: Math.round(safetyScore),
    label: safetyScore >= 80 ? 'Low Risk' : safetyScore >= 60 ? 'Moderate Risk' : 'Higher Risk',
    reasoning: `Overall risk index: ${Math.round(riskScore)}/100`,
  }
}

function scoreLegal(features: FeatureVector | null): GradeDetail {
  let score = 70
  if (features?.reraRegistered) score = 85
  if (features?.documentCompletenessScore) score = Math.round((score + features.documentCompletenessScore) / 2)
  if (features?.litigationCount && features.litigationCount > 0) score -= features.litigationCount * 15
  if (features?.hasEncumbrance) score -= 20

  return {
    grade: toGradeSymbol(score),
    score: Math.min(100, Math.max(0, Math.round(score))),
    label: score >= 80 ? 'Clean Title' : score >= 60 ? 'Minor Issues' : 'Legal Caution',
    reasoning: `RERA: ${features?.reraRegistered ? 'Yes' : 'No'}. Document score: ${features?.documentCompletenessScore?.toFixed(0) ?? 'N/A'}%`,
  }
}

// ─── CAGR & Strategy ──────────────────────────────────────────────────────────

function computeCAGR(features: FeatureVector | null, infra: InfrastructureRecord[]) {
  const base = features?.avgAppreciationPct ?? 5
  const infraBonus = infra.filter(i => i.status === 'UNDER_CONSTRUCTION').length * 0.5

  return {
    conservative: Math.max(1, base * 0.6),
    base: base + infraBonus,
    optimistic: base * 1.5 + infraBonus,
    years: 3,
  }
}

function computeOpportunityScore(
  features: FeatureVector | null,
  infra: InfrastructureRecord[],
  grade: InvestmentGrade
): number {
  let score = 50

  if (grade === 'A+') score += 25
  else if (grade === 'A') score += 15
  else if (grade === 'B+') score += 5

  const upcomingInfra = infra.filter(i => i.status !== 'COMPLETED').length
  score += upcomingInfra * 5

  if (features?.demandIndex && features.demandIndex > 70) score += 10
  if (features?.vacancyRateArea && features.vacancyRateArea < 5) score += 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

function computeStrategy(
  rentalYield: number,
  overallScore: number,
  features: FeatureVector | null
): {
  strategy: InvestmentIntelligence['investmentStrategy']
  strategyReasoning: string
  bestHoldingPeriod: { years: number; reasoning: string }
} {
  if (overallScore < 40) {
    return {
      strategy: 'NOT_RECOMMENDED',
      strategyReasoning: 'Multiple risk factors detected. Not recommended as an investment without professional review.',
      bestHoldingPeriod: { years: 0, reasoning: 'Investment not recommended at current price.' },
    }
  }

  if (rentalYield >= 7) {
    return {
      strategy: 'RENTAL_INCOME',
      strategyReasoning: 'High rental yield makes this ideal for passive income. Strong cashflow expected from year 1.',
      bestHoldingPeriod: { years: 7, reasoning: 'Long-term rental income while benefiting from capital appreciation.' },
    }
  }

  if (features?.avgAppreciationPct && features.avgAppreciationPct >= 10) {
    return {
      strategy: 'BUY_AND_HOLD',
      strategyReasoning: 'Strong appreciation history. Buy and hold for 5-7 years to maximize capital gains.',
      bestHoldingPeriod: { years: 5, reasoning: 'Area shows consistent appreciation. Optimal exit is post-infrastructure completion.' },
    }
  }

  return {
    strategy: 'BUY_AND_HOLD',
    strategyReasoning: 'Balanced appreciation potential with moderate rental yield.',
    bestHoldingPeriod: { years: 4, reasoning: 'Standard hold period for emerging area maturation.' },
  }
}

function computeExitPotential(
  features: FeatureVector | null,
  liquidityScore: number
): InvestmentIntelligence['exitPotential'] {
  const combined = Math.round((liquidityScore + (features?.demandIndex ?? 50)) / 2)
  if (combined >= 80) return 'EXCELLENT'
  if (combined >= 60) return 'GOOD'
  if (combined >= 40) return 'MODERATE'
  return 'POOR'
}

function computeOccupancy(features: FeatureVector | null): number {
  if (!features?.vacancyRateArea) return 85
  return Math.max(0, Math.min(100, 100 - features.vacancyRateArea))
}

function computeTopFactors(
  features: FeatureVector | null,
  infra: InfrastructureRecord[],
  rentalGrade: GradeDetail,
  growthGrade: GradeDetail
): FeatureImportance[] {
  return [
    {
      feature: 'rental_yield',
      displayName: 'Rental Yield',
      value: `${features?.rentalYieldArea?.toFixed(1) ?? 'N/A'}%`,
      shapValue: 0.12,
      impactPct: rentalGrade.score - 50,
      direction: rentalGrade.score >= 50 ? 'positive' : 'negative',
    },
    {
      feature: 'area_appreciation',
      displayName: 'Area Appreciation',
      value: `${features?.avgAppreciationPct?.toFixed(1) ?? 'N/A'}% CAGR`,
      shapValue: 0.18,
      impactPct: growthGrade.score - 50,
      direction: growthGrade.score >= 50 ? 'positive' : 'negative',
    },
    {
      feature: 'infrastructure_nearby',
      displayName: 'Nearby Infrastructure',
      value: `${infra.length} projects`,
      shapValue: 0.10,
      impactPct: infra.length * 5,
      direction: 'positive' as const,
    },
  ]
}

function computeInvestmentRisks(features: FeatureVector | null, rentalYield: number) {
  const risks = []

  if (rentalYield < 3) {
    risks.push({
      category: 'FINANCIAL',
      name: 'Low Rental Yield',
      severity: 'MEDIUM' as const,
      description: `Rental yield of ${rentalYield.toFixed(1)}% is below market average`,
      mitigation: 'Negotiate a lower purchase price to improve yield',
    })
  }

  if (features?.inventoryMonths && features.inventoryMonths > 18) {
    risks.push({
      category: 'MARKET',
      name: 'Oversupply Risk',
      severity: 'HIGH' as const,
      description: `${Math.round(features.inventoryMonths)} months of inventory — oversupply may pressure prices`,
      mitigation: 'Monitor absorption rate quarterly. Consider shorter hold period.',
    })
  }

  return risks
}

// ─── Supplementary Data Loader ────────────────────────────────────────────────

type InfrastructureRecord = {
  name: string
  type: string
  status: string
  estimatedPriceImpactPct: number
  timelineMonths?: number
}

async function loadSupplementaryData(entityId: string, entityType: EntityType) {
  let city = '', community = null, countryIso2 = 'AE', sqft = null, askingPrice = null

  if (entityType === 'MANUAL_PROPERTY') {
    const prop = await prisma.manualProperty.findUnique({
      where: { id: entityId },
      select: { city: true, community: true, countryIso2: true, squareFeet: true, price: true },
    })
    if (prop) {
      city = prop.city ?? ''
      community = prop.community
      countryIso2 = prop.countryIso2 ?? 'AE'
      sqft = prop.squareFeet
      askingPrice = prop.price
    }
  }

  // Load nearby infrastructure from knowledge graph + infrastructure events
  const edges = await prisma.propertyKnowledgeEdge.findMany({
    where: {
      sourceType: entityType,
      sourceId: entityId,
      edgeType: { in: ['PROPERTY_NEAR_METRO', 'PROPERTY_NEAR_IT_HUB', 'PROPERTY_NEAR_HIGHWAY', 'AREA_NEAR_INFRA'] },
    },
    take: 10,
  })

  // Also load city-level infrastructure events
  const infraEvents = await prisma.infrastructureEvent.findMany({
    where: {
      countryIso2,
      city: { contains: city, mode: 'insensitive' },
      status: { notIn: ['CANCELLED', 'COMPLETED'] },
    },
    take: 10,
    select: { name: true, type: true, status: true, estimatedPriceImpactPct: true, timelineMonths: true },
  })

  const nearbyInfra: InfrastructureRecord[] = infraEvents.map(e => ({
    name: e.name,
    type: e.type,
    status: e.status,
    estimatedPriceImpactPct: e.estimatedPriceImpactPct ?? 0,
    timelineMonths: e.timelineMonths ?? undefined,
  }))

  return { nearbyInfra, askingPrice, city, community, countryIso2, sqft }
}

// ─── Grade Helpers ────────────────────────────────────────────────────────────

function toGrade(score: number): GradeDetail {
  const grade = toGradeSymbol(score)
  return {
    grade,
    score,
    label: {
      'A+': 'Exceptional',
      'A': 'Excellent',
      'B+': 'Very Good',
      'B': 'Good',
      'C+': 'Above Average',
      'C': 'Average',
      'D': 'Below Average',
    }[grade] ?? 'Average',
    reasoning: `Composite investment score: ${score}/100`,
  }
}

function toGradeSymbol(score: number): InvestmentGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C+'
  if (score >= 40) return 'C'
  return 'D'
}
