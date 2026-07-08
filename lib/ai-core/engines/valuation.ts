// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AIShield Valuation Engine v2
// Volume 3: AI/ML Pipeline — Engine: SHIELD
//
// This is the production AVM (Automated Valuation Model) engine.
// Phase 1: Comparable-based statistical valuation (no ML dependency)
// Phase 2: XGBoost/LightGBM model ensemble (after training data accumulates)
//
// Architecture:
//   Features → Comparable Engine → Market Signal Engine → Fusion →
//   Distribution → Confidence → Explainability → ValuationReport
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import { computeConfidence } from '../confidence'
import type { FeatureVector } from '../feature-store'
import type {
  EntityType,
  ValuationReport,
  Comparable,
  PricePoint,
  FeatureImportance,
  RiskFactor,
  MarketHeat,
} from '../types'

const ENGINE_VERSION = '2.0.0'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

interface EngineOptions {
  forceRefresh?: boolean
  requestedBy?: string
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runValuationEngine(
  entityId: string,
  entityType: EntityType,
  features: FeatureVector | null,
  options: EngineOptions = {}
): Promise<ValuationReport | null> {
  const startTime = Date.now()

  // ── Step 1: Check existing result cache ───────────────────────────────────
  if (!options.forceRefresh) {
    const cached = await getCachedValuation(entityId, entityType)
    if (cached) return cached
  }

  // ── Step 2: Load property data ────────────────────────────────────────────
  const propertyData = await loadPropertyData(entityId, entityType)
  if (!propertyData) return null

  const { price, sqft, bedrooms, city, community, countryIso2, currency } = propertyData

  // ── Step 3: Find comparable properties ───────────────────────────────────
  const { comparables, fallbackLevel } = await findComparables({
    entityId,
    entityType,
    sqft,
    bedrooms,
    city,
    community,
    countryIso2,
    price,
  })

  // ── Step 4: Compute market statistics from comparables ────────────────────
  const stats = computeMarketStats(comparables)

  // ── Step 5: Compute fair value range ──────────────────────────────────────
  const fairValue = computeFairValue(sqft, stats, features)

  // ── Step 6: Market position ────────────────────────────────────────────────
  const position = computeMarketPosition(price, fairValue.mid)

  // ── Step 7: Negotiation intelligence ──────────────────────────────────────
  const negotiation = computeNegotiation(price, fairValue, position.marketPosition)

  // ── Step 8: Price timeline ────────────────────────────────────────────────
  const timeline = await getPriceTimeline(city, community, countryIso2)

  // ── Step 9: Future projection ─────────────────────────────────────────────
  const projection = computeProjection(fairValue.mid, features, timeline)

  // ── Step 10: Confidence ───────────────────────────────────────────────────
  const confidence = computeConfidence({
    comparablesCount: comparables.length,
    comparablesQuality: stats.qualityScore,
    dataRecency: 30,
    featureCompleteness: features?.completeness,
    marketDataPoints: stats.count,
    hasGeoCoords: Boolean(features?.latitude && features?.longitude),
  })

  // ── Step 11: Price drivers (SHAP-style) ───────────────────────────────────
  const priceDrivers = computePriceDrivers(features)

  // ── Step 12: Hidden risks ──────────────────────────────────────────────────
  const hiddenRisks = computeHiddenRisks(features)

  // ── Step 13: Assemble report ──────────────────────────────────────────────
  const report: ValuationReport = {
    entityId,
    entityType,
    fairValue: {
      min: fairValue.min,
      mid: fairValue.mid,
      max: fairValue.max,
      currency,
    },
    confidence,
    askingPrice: price ?? null,
    marketPosition: position.marketPosition,
    deviationPercent: position.deviationPercent,
    pricePosition: position.percentile,
    negotiationRange: negotiation,
    sellerAdvantage: position.sellerAdvantage,
    buyerAdvantage: position.buyerAdvantage,
    marketHeat: (features?.marketHeat as MarketHeat) ?? 'NEUTRAL',
    liquidityScore: features?.demandIndex ?? 50,
    comparables: comparables.slice(0, 10),
    comparablesStats: {
      count: comparables.length,
      avgPricePerSqft: stats.avgPricePerSqft,
      medianPrice: stats.medianPrice,
      weightedAvgPricePerSqft: stats.weightedAvg,
    },
    priceTimeline: timeline,
    priceVolatility: features?.priceVolatilityScore ?? 20,
    trendDirection: computeTrendDirection(timeline),
    trendOverallChangePercent: computeTrendChange(timeline),
    futureProjection: projection,
    riskScore: {
      overall: computeOverallRisk(features),
      legalRisk: features?.litigationCount ? Math.min(100, features.litigationCount * 25) : 10,
      marketRisk: features?.priceVolatilityScore ?? 20,
      developerRisk: features?.developerDelayPct ? Math.min(100, features.developerDelayPct * 2) : 10,
      liquidityRisk: features?.inventoryMonths ? Math.min(100, features.inventoryMonths * 15) : 20,
      mediaRisk: features?.aiManipulationScore ?? 0,
      factors: hiddenRisks,
      riskLabel: getRiskLabel(computeOverallRisk(features)),
    },
    priceDrivers,
    hiddenRisks,
    explainability: {
      summary: generateSummary(position.marketPosition, position.deviationPercent, comparables.length),
      topFactors: priceDrivers,
      methodology: `Comparable-based AVM using ${comparables.length} properties (fallback: ${fallbackLevel})`,
      disclaimer: 'AI estimates are indicative only. Always verify with a certified valuer.',
      reasoning: generateDetailedReasoning(fairValue, stats, position, features),
    },
    modelVersion: ENGINE_VERSION,
    modelName: 'avm_comparable_v2',
    computedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    cacheHit: false,
    processingMs: Date.now() - startTime,
  }

  // ── Step 14: Persist result ───────────────────────────────────────────────
  await persistValuation(entityId, entityType, report).catch(() => {})

  return report
}

// ─── Load Property Data ───────────────────────────────────────────────────────

async function loadPropertyData(entityId: string, entityType: EntityType) {
  if (entityType === 'MANUAL_PROPERTY') {
    const prop = await prisma.manualProperty.findUnique({
      where: { id: entityId },
      select: {
        price: true, squareFeet: true, bedrooms: true,
        city: true, community: true, countryIso2: true, currency: true,
        latitude: true, longitude: true, propertyType: true,
      },
    })
    if (!prop) return null
    return {
      price: prop.price,
      sqft: prop.squareFeet > 0 ? prop.squareFeet : null,
      bedrooms: prop.bedrooms,
      city: prop.city ?? '',
      community: prop.community,
      countryIso2: prop.countryIso2 ?? 'AE',
      currency: prop.currency,
    }
  }

  if (entityType === 'PROJECT') {
    const proj = await prisma.project.findUnique({
      where: { id: entityId },
      select: {
        startingPrice: true, city: true, community: true,
        countryIso2: true,
        unitTypes: { select: { priceFrom: true, bedrooms: true }, take: 1 },
      },
    })
    if (!proj) return null
    return {
      price: proj.startingPrice,
      sqft: null,
      bedrooms: proj.unitTypes[0]?.bedrooms ?? null,
      city: proj.city ?? '',
      community: proj.community,
      countryIso2: proj.countryIso2 ?? 'AE',
      currency: 'AED',
    }
  }

  return null
}

// ─── Comparable Finder ────────────────────────────────────────────────────────

interface ComparableSearchParams {
  entityId: string
  entityType: EntityType
  sqft: number | null
  bedrooms: number | null
  city: string
  community?: string | null
  countryIso2: string
  price: number | null
}

async function findComparables(params: ComparableSearchParams) {
  const { entityId, sqft, bedrooms, city, community, countryIso2, price } = params

  // Attempt 1: Same community, similar BHK
  let results = await searchComparables({
    entityId, city, community: community ?? null, bedrooms, sqft, countryIso2,
    sameCommOnly: true,
  })
  if (results.length >= 3) return { comparables: results, fallbackLevel: 'COMMUNITY' }

  // Attempt 2: Same city, same BHK
  results = await searchComparables({
    entityId, city, community: null, bedrooms, sqft, countryIso2,
    sameCommOnly: false,
  })
  if (results.length >= 3) return { comparables: results, fallbackLevel: 'CITY' }

  // Attempt 3: Same city, BHK +/- 1
  results = await searchComparables({
    entityId, city, community: null, bedrooms, sqft, countryIso2,
    sameCommOnly: false, bedroomFlex: true,
  })
  if (results.length >= 1) return { comparables: results, fallbackLevel: 'CITY_FLEX' }

  // Attempt 4: Country-level (very low confidence)
  results = await searchComparables({
    entityId, city: null, community: null, bedrooms, sqft, countryIso2,
    sameCommOnly: false, bedroomFlex: true,
  })
  return { comparables: results, fallbackLevel: 'COUNTRY' }
}

async function searchComparables(params: {
  entityId: string
  city: string | null
  community: string | null
  bedrooms: number | null
  sqft: number | null
  countryIso2: string
  sameCommOnly: boolean
  bedroomFlex?: boolean
}): Promise<Comparable[]> {
  const { city, community, bedrooms, sqft, countryIso2, sameCommOnly, bedroomFlex } = params

  const where: any = {
    id: { not: params.entityId },
    status: 'APPROVED',
    price: { not: null },
    squareFeet: { gt: 0 },
    countryIso2,
  }

  if (city) where.city = { contains: city, mode: 'insensitive' }
  if (community && sameCommOnly) where.community = { contains: community, mode: 'insensitive' }
  if (bedrooms !== null) {
    where.bedrooms = bedroomFlex
      ? { gte: Math.max(0, (bedrooms ?? 1) - 1), lte: (bedrooms ?? 1) + 1 }
      : { equals: bedrooms }
  }

  const props = await prisma.manualProperty.findMany({
    where,
    select: {
      id: true, price: true, squareFeet: true, bedrooms: true,
      city: true, community: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return props
    .filter(p => p.price && p.squareFeet > 0)
    .map(p => {
      const pricePerSqft = p.price! / p.squareFeet
      const similarity = computeSimilarity(p, { sqft, bedrooms })
      const recencyWeight = computeRecencyWeight(p.createdAt)

      return {
        entityId: p.id,
        title: `${p.bedrooms}BR in ${p.community ?? p.city}`,
        price: p.price!,
        pricePerSqft,
        sqft: p.squareFeet,
        bedrooms: p.bedrooms ?? 0,
        city: p.city ?? '',
        community: p.community ?? undefined,
        source: 'PLATFORM',
        similarityScore: similarity,
        recencyWeight,
      }
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
}

// ─── Market Statistics ────────────────────────────────────────────────────────

interface MarketStats {
  avgPricePerSqft: number
  medianPricePerSqft: number
  medianPrice: number
  weightedAvg: number
  count: number
  qualityScore: number
}

function computeMarketStats(comparables: Comparable[]): MarketStats {
  if (comparables.length === 0) {
    return { avgPricePerSqft: 0, medianPricePerSqft: 0, medianPrice: 0, weightedAvg: 0, count: 0, qualityScore: 0 }
  }

  const sorted = [...comparables].sort((a, b) => a.pricePerSqft - b.pricePerSqft)
  const mid = Math.floor(sorted.length / 2)
  const medianPricePerSqft = sorted.length % 2 === 0
    ? (sorted[mid - 1].pricePerSqft + sorted[mid].pricePerSqft) / 2
    : sorted[mid].pricePerSqft

  const avgPricePerSqft = comparables.reduce((s, c) => s + c.pricePerSqft, 0) / comparables.length

  // Weighted average by similarity score
  const totalWeight = comparables.reduce((s, c) => s + c.similarityScore, 0)
  const weightedAvg = totalWeight > 0
    ? comparables.reduce((s, c) => s + c.pricePerSqft * (c.similarityScore / totalWeight), 0)
    : avgPricePerSqft

  const medianPrices = [...comparables].sort((a, b) => a.price - b.price)
  const medianPrice = medianPrices.length % 2 === 0
    ? (medianPrices[mid - 1].price + medianPrices[mid].price) / 2
    : medianPrices[Math.floor(medianPrices.length / 2)].price

  const avgSimilarity = comparables.reduce((s, c) => s + c.similarityScore, 0) / comparables.length
  const qualityScore = Math.round(avgSimilarity * 100)

  return { avgPricePerSqft, medianPricePerSqft, medianPrice, weightedAvg, count: comparables.length, qualityScore }
}

// ─── Fair Value Computation ───────────────────────────────────────────────────

function computeFairValue(
  sqft: number | null,
  stats: MarketStats,
  features: FeatureVector | null
): { min: number; mid: number; max: number } {
  const ppsf = stats.weightedAvg || stats.avgPricePerSqft || 0
  const sqftVal = sqft ?? 1000

  // Location premium/discount
  const locationMultiplier = computeLocationMultiplier(features)
  
  const adjustedPpsf = ppsf * locationMultiplier
  const mid = Math.round(adjustedPpsf * sqftVal)
  
  // Range is +/- based on market volatility
  const volatility = features?.priceVolatilityScore ?? 15
  const rangePercent = Math.max(5, Math.min(20, volatility)) / 100

  return {
    min: Math.round(mid * (1 - rangePercent)),
    mid,
    max: Math.round(mid * (1 + rangePercent)),
  }
}

function computeLocationMultiplier(features: FeatureVector | null): number {
  if (!features) return 1.0
  
  let multiplier = 1.0
  
  // Metro proximity premium
  if (features.distanceMetroKm !== undefined) {
    if (features.distanceMetroKm < 0.5) multiplier *= 1.12
    else if (features.distanceMetroKm < 1.0) multiplier *= 1.06
    else if (features.distanceMetroKm < 2.0) multiplier *= 1.02
    else if (features.distanceMetroKm > 5.0) multiplier *= 0.95
  }
  
  // Floor premium (higher floors cost more in UAE/India)
  if (features.floorRatio !== undefined) {
    multiplier *= 1 + (features.floorRatio * 0.05)
  }
  
  // Developer quality premium
  if (features.developerReputationScore !== undefined) {
    const devFactor = (features.developerReputationScore - 50) / 1000  // ±5%
    multiplier *= 1 + devFactor
  }
  
  return Math.max(0.80, Math.min(1.25, multiplier))
}

// ─── Market Position ──────────────────────────────────────────────────────────

function computeMarketPosition(
  askingPrice: number | null,
  fairValueMid: number
): {
  marketPosition: ValuationReport['marketPosition']
  deviationPercent: number
  percentile: number
  sellerAdvantage: number
  buyerAdvantage: number
} {
  if (!askingPrice || fairValueMid === 0) {
    return {
      marketPosition: 'FAIR',
      deviationPercent: 0,
      percentile: 50,
      sellerAdvantage: 50,
      buyerAdvantage: 50,
    }
  }

  const deviation = ((askingPrice - fairValueMid) / fairValueMid) * 100

  let marketPosition: ValuationReport['marketPosition']
  if (deviation < -10) marketPosition = 'UNDERPRICED'
  else if (deviation <= 5) marketPosition = 'FAIR'
  else if (deviation <= 15) marketPosition = 'SLIGHTLY_OVERPRICED'
  else if (deviation <= 30) marketPosition = 'OVERPRICED'
  else marketPosition = 'PREMIUM'

  // Buyer/seller advantage is inverse
  const buyerAdv = Math.max(0, Math.min(100, 50 - deviation * 2))
  const sellerAdv = 100 - buyerAdv
  const percentile = Math.max(0, Math.min(100, 50 + deviation * 2))

  return {
    marketPosition,
    deviationPercent: Math.round(deviation * 10) / 10,
    percentile,
    sellerAdvantage: Math.round(sellerAdv),
    buyerAdvantage: Math.round(buyerAdv),
  }
}

// ─── Negotiation Intelligence ─────────────────────────────────────────────────

function computeNegotiation(
  askingPrice: number | null,
  fairValue: { min: number; mid: number; max: number },
  position: ValuationReport['marketPosition']
): ValuationReport['negotiationRange'] {
  const base = askingPrice ?? fairValue.mid

  let strategy: string
  let floorMultiplier: number
  let ceilingMultiplier: number

  switch (position) {
    case 'UNDERPRICED':
      strategy = 'High demand expected — offer asking or above to secure this deal'
      floorMultiplier = 0.98; ceilingMultiplier = 1.02
      break
    case 'FAIR':
      strategy = 'Property is fairly priced — standard 2-5% negotiation applies'
      floorMultiplier = 0.95; ceilingMultiplier = 1.00
      break
    case 'SLIGHTLY_OVERPRICED':
      strategy = 'Modest overpricing detected — offer 5-8% below asking price'
      floorMultiplier = 0.90; ceilingMultiplier = 0.97
      break
    case 'OVERPRICED':
      strategy = 'Property is overpriced — target 10-15% below asking price'
      floorMultiplier = 0.85; ceilingMultiplier = 0.93
      break
    case 'PREMIUM':
      strategy = 'Significant premium — only proceed if premium features justify price'
      floorMultiplier = 0.75; ceilingMultiplier = 0.88
      break
    default:
      strategy = 'Standard negotiation applies'
      floorMultiplier = 0.93; ceilingMultiplier = 1.00
  }

  return {
    floor: Math.round(base * floorMultiplier),
    ceiling: Math.round(base * ceilingMultiplier),
    recommendedOffer: Math.round((base * floorMultiplier + base * ceilingMultiplier) / 2),
    strategy,
  }
}

// ─── Price Timeline ───────────────────────────────────────────────────────────

async function getPriceTimeline(
  city: string,
  community: string | null | undefined,
  countryIso2: string
): Promise<PricePoint[]> {
  // Load historical market snapshots for this area
  const marketKey = community
    ? `${countryIso2}:${city}:${community}`
    : `${countryIso2}:${city}`

  const snapshots = await prisma.marketSnapshot.findMany({
    where: { marketKey: { startsWith: marketKey } },
    orderBy: { snapshotDate: 'asc' },
    take: 24,
    select: {
      snapshotDate: true,
      avgPricePerSqft: true,
      medianTotalPrice: true,
      transactionsCount: true,
      priceChangeMomPct: true,
    },
  })

  return snapshots.map(s => ({
    period: s.snapshotDate.toISOString().substring(0, 7),  // YYYY-MM
    avgPricePerSqft: s.avgPricePerSqft,
    medianPrice: s.medianTotalPrice,
    transactionCount: s.transactionsCount,
    priceChangePercent: s.priceChangeMomPct,
  }))
}

// ─── Future Projection ────────────────────────────────────────────────────────

function computeProjection(
  currentValue: number,
  features: FeatureVector | null,
  timeline: PricePoint[]
): ValuationReport['futureProjection'] {
  const baseCAGR = features?.avgAppreciationPct ?? 5  // default 5% CAGR

  // Adjust CAGR based on demand index and infrastructure
  let adjustedCAGR = baseCAGR
  if (features?.demandIndex && features.demandIndex > 70) adjustedCAGR += 1.5
  if (features?.distanceMetroKm && features.distanceMetroKm < 1) adjustedCAGR += 1
  if (features?.investmentGrade === 'A_PLUS' || features?.investmentGrade === 'A') adjustedCAGR += 2

  const bullCAGR = adjustedCAGR * 1.4
  const bearCAGR = adjustedCAGR * 0.5

  const project = (cagr: number, years: number) =>
    Math.round(currentValue * Math.pow(1 + cagr / 100, years))

  return {
    months12: project(adjustedCAGR, 1),
    months24: project(adjustedCAGR, 2),
    months36: project(adjustedCAGR, 3),
    cagrPercent: Math.round(adjustedCAGR * 10) / 10,
    scenarioBull: project(bullCAGR, 3),
    scenarioBase: project(adjustedCAGR, 3),
    scenarioBear: project(bearCAGR, 3),
  }
}

// ─── Price Drivers (SHAP-style) ───────────────────────────────────────────────

function computePriceDrivers(features: FeatureVector | null): FeatureImportance[] {
  const drivers: FeatureImportance[] = []

  if (!features) return drivers

  if (features.distanceMetroKm !== undefined) {
    const impact = features.distanceMetroKm < 1 ? 8 : features.distanceMetroKm < 3 ? 3 : -2
    drivers.push({
      feature: 'distance_metro_km',
      displayName: 'Metro Proximity',
      value: `${features.distanceMetroKm.toFixed(1)} km`,
      shapValue: impact / 100,
      impactPct: impact,
      direction: impact > 0 ? 'positive' : impact < 0 ? 'negative' : 'neutral',
    })
  }

  if (features.bedroomCount !== undefined) {
    drivers.push({
      feature: 'bedroom_count',
      displayName: 'Bedrooms',
      value: `${features.bedroomCount} BHK`,
      shapValue: 0.05,
      impactPct: 5,
      direction: 'positive',
    })
  }

  if (features.developerReputationScore !== undefined) {
    const impact = (features.developerReputationScore - 50) / 10
    drivers.push({
      feature: 'developer_reputation_score',
      displayName: 'Developer Reputation',
      value: `${Math.round(features.developerReputationScore)}/100`,
      shapValue: impact / 100,
      impactPct: impact,
      direction: impact >= 0 ? 'positive' : 'negative',
    })
  }

  if (features.has3dTour) {
    drivers.push({
      feature: 'has_3d_tour',
      displayName: '3D Virtual Tour',
      value: 'Available',
      shapValue: 0.02,
      impactPct: 2,
      direction: 'positive',
    })
  }

  if (features.reraRegistered) {
    drivers.push({
      feature: 'rera_registered',
      displayName: 'RERA Registered',
      value: 'Yes',
      shapValue: 0.04,
      impactPct: 4,
      direction: 'positive',
    })
  }

  return drivers.sort((a, b) => Math.abs(b.impactPct) - Math.abs(a.impactPct)).slice(0, 8)
}

// ─── Hidden Risks ─────────────────────────────────────────────────────────────

function computeHiddenRisks(features: FeatureVector | null): RiskFactor[] {
  const risks: RiskFactor[] = []
  if (!features) return risks

  if (features.litigationCount && features.litigationCount > 0) {
    risks.push({
      category: 'LEGAL',
      name: 'Active Litigation',
      severity: features.litigationCount > 2 ? 'HIGH' : 'MEDIUM',
      description: `${features.litigationCount} litigation case(s) found against this property or developer`,
      mitigation: 'Review court records and consult a property lawyer before proceeding',
    })
  }

  if (features.hasEncumbrance) {
    risks.push({
      category: 'LEGAL',
      name: 'Encumbrance Detected',
      severity: 'HIGH',
      description: 'Property has outstanding mortgage or lien obligations',
      mitigation: 'Obtain full encumbrance certificate and verify loan clearance',
    })
  }

  if (features.hasDefectsDetected) {
    risks.push({
      category: 'STRUCTURAL',
      name: 'Structural Issues Detected',
      severity: 'MEDIUM',
      description: 'AI image analysis detected potential structural defects in property media',
      mitigation: 'Request physical inspection before finalizing purchase',
    })
  }

  if (features.developerDelayPct && features.developerDelayPct > 30) {
    risks.push({
      category: 'DEVELOPER',
      name: 'High Developer Delay Risk',
      severity: features.developerDelayPct > 50 ? 'HIGH' : 'MEDIUM',
      description: `Developer has ${Math.round(features.developerDelayPct)}% project delay rate`,
      mitigation: 'Review developer track record. Consider ready-to-move options.',
    })
  }

  if (features.inventoryMonths && features.inventoryMonths > 12) {
    risks.push({
      category: 'MARKET',
      name: 'High Supply / Low Demand',
      severity: 'MEDIUM',
      description: `${Math.round(features.inventoryMonths)} months of inventory — exit may take longer than expected`,
      mitigation: 'Factor extended holding period into investment calculation',
    })
  }

  return risks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSimilarity(prop: any, target: { sqft: number | null; bedrooms: number | null }): number {
  let score = 0.5  // base

  if (target.bedrooms !== null && prop.bedrooms === target.bedrooms) score += 0.3
  if (target.sqft && prop.squareFeet > 0) {
    const diff = Math.abs(prop.squareFeet - target.sqft) / target.sqft
    score += Math.max(0, 0.2 - diff * 0.5)
  }

  return Math.min(1, score)
}

function computeRecencyWeight(date: Date): number {
  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 30) return 1.0
  if (days <= 90) return 0.85
  if (days <= 180) return 0.70
  if (days <= 365) return 0.50
  return 0.25
}

function computeOverallRisk(features: FeatureVector | null): number {
  if (!features) return 30
  let risk = 20
  if (features.litigationCount) risk += features.litigationCount * 10
  if (features.hasEncumbrance) risk += 20
  if (features.hasDefectsDetected) risk += 10
  if (features.priceVolatilityScore) risk += features.priceVolatilityScore * 0.3
  return Math.min(100, Math.round(risk))
}

function getRiskLabel(score: number): 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
  if (score < 15) return 'VERY_LOW'
  if (score < 30) return 'LOW'
  if (score < 50) return 'MODERATE'
  if (score < 70) return 'HIGH'
  return 'VERY_HIGH'
}

function computeTrendDirection(timeline: PricePoint[]): 'up' | 'down' | 'stable' {
  if (timeline.length < 2) return 'stable'
  const first = timeline[0].avgPricePerSqft
  const last = timeline[timeline.length - 1].avgPricePerSqft
  const change = (last - first) / first
  if (change > 0.03) return 'up'
  if (change < -0.03) return 'down'
  return 'stable'
}

function computeTrendChange(timeline: PricePoint[]): number {
  if (timeline.length < 2) return 0
  const first = timeline[0].avgPricePerSqft
  const last = timeline[timeline.length - 1].avgPricePerSqft
  return Math.round(((last - first) / first) * 1000) / 10
}

function generateSummary(
  position: ValuationReport['marketPosition'],
  deviation: number,
  compCount: number
): string {
  const posText = {
    UNDERPRICED: `priced ${Math.abs(deviation).toFixed(1)}% below fair market value — a strong opportunity`,
    FAIR: 'fairly priced relative to comparable properties in the area',
    SLIGHTLY_OVERPRICED: `priced ${deviation.toFixed(1)}% above fair market value — moderate overpricing detected`,
    OVERPRICED: `significantly overpriced at ${deviation.toFixed(1)}% above market value`,
    PREMIUM: `commanding a premium of ${deviation.toFixed(1)}% above market value`,
  }[position] ?? 'priced at or near market value'

  return `Based on ${compCount} comparable properties, this listing is ${posText}.`
}

function generateDetailedReasoning(
  fairValue: { min: number; mid: number; max: number },
  stats: MarketStats,
  position: { marketPosition: string; deviationPercent: number },
  features: FeatureVector | null
): string {
  const currency = 'AED'
  return [
    `Fair market value estimated at ${currency} ${fairValue.mid.toLocaleString()} (range: ${currency} ${fairValue.min.toLocaleString()} – ${currency} ${fairValue.max.toLocaleString()}).`,
    `Analysis based on ${stats.count} comparable properties with weighted average of ${currency} ${stats.weightedAvg.toFixed(0)}/sqft.`,
    features?.distanceMetroKm
      ? `Metro connectivity: ${features.distanceMetroKm.toFixed(1)} km to nearest station.`
      : '',
    features?.reraRegistered ? 'Property is RERA registered.' : '',
  ].filter(Boolean).join(' ')
}

// ─── Cache Management ─────────────────────────────────────────────────────────

async function getCachedValuation(
  entityId: string,
  entityType: EntityType
): Promise<ValuationReport | null> {
  try {
    const entityTypeEnum = entityType === 'MANUAL_PROPERTY' ? 'MANUAL_PROPERTY' : 'PROJECT'
    const cached = await (prisma as any).verixShieldResult.findUnique({
      where: { entityType_entityId: { entityType: entityTypeEnum, entityId } },
    })

    if (!cached) return null

    const expiresAt = new Date(cached.expiresAt ?? Date.now() - 1)
    if (expiresAt < new Date()) return null

    // Convert existing cache to new ValuationReport format
    return {
      entityId,
      entityType,
      fairValue: {
        min: cached.estimatedMin ?? 0,
        mid: cached.estimatedMedian ?? 0,
        max: cached.estimatedMax ?? 0,
        currency: 'AED',
      },
      confidence: {
        score: cached.confidence ?? 0,
        grade: (cached.confidence ?? 0) >= 80 ? 'A' : 'B',
        factors: [],
        dataPointsUsed: 0,
        lastDataUpdate: new Date().toISOString(),
        reasons: [],
      },
      askingPrice: cached.askingPrice ?? null,
      marketPosition: 'FAIR',
      deviationPercent: 0,
      pricePosition: 50,
      negotiationRange: { floor: 0, ceiling: 0, recommendedOffer: 0, strategy: '' },
      sellerAdvantage: 50,
      buyerAdvantage: 50,
      marketHeat: 'NEUTRAL',
      liquidityScore: 50,
      comparables: [],
      comparablesStats: { count: 0, avgPricePerSqft: 0, medianPrice: 0, weightedAvgPricePerSqft: 0 },
      priceTimeline: [],
      priceVolatility: 20,
      trendDirection: 'stable',
      trendOverallChangePercent: 0,
      futureProjection: { months12: 0, months24: 0, months36: 0, cagrPercent: 0, scenarioBull: 0, scenarioBase: 0, scenarioBear: 0 },
      riskScore: { overall: 30, legalRisk: 10, marketRisk: 20, developerRisk: 10, liquidityRisk: 20, mediaRisk: 0, factors: [], riskLabel: 'LOW' },
      priceDrivers: [],
      hiddenRisks: [],
      explainability: { summary: '', topFactors: [], methodology: '', disclaimer: '', reasoning: '' },
      modelVersion: ENGINE_VERSION,
      modelName: 'avm_comparable_v2',
      computedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      cacheHit: true,
    }
  } catch {
    return null
  }
}

async function persistValuation(
  entityId: string,
  entityType: EntityType,
  report: ValuationReport
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS)
    const data = {
      estimatedMin: report.fairValue.min,
      estimatedMedian: report.fairValue.mid,
      estimatedMax: report.fairValue.max,
      confidence: report.confidence.score,
      askingPrice: report.askingPrice ?? null,
      status: mapStatusToEnum(report.marketPosition) as any,
      demandScore: report.liquidityScore,
      modelVersion: report.modelVersion,
      comparablesCount: report.comparables.length,
      deviation: report.deviationPercent,
      computedAt: new Date(),
      expiresAt,
    }
    await (prisma as any).verixShieldResult.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: { entityType, entityId, ...data },
      update: data,
    })
  } catch {
    // Non-fatal
  }
}

function mapStatusToEnum(position: ValuationReport['marketPosition']): string {
  switch (position) {
    case 'UNDERPRICED': return 'UNDERPRICED'
    case 'FAIR': return 'FAIR'
    case 'SLIGHTLY_OVERPRICED': return 'OVERPRICED'
    case 'OVERPRICED': return 'OVERPRICED'
    case 'PREMIUM': return 'SUSPICIOUS'
    default: return 'INSUFFICIENT_DATA'
  }
}
