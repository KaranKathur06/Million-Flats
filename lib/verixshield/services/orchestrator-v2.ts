// ━━━ VerixShield v2.1 — Orchestrator (Intelligence Engine Controller) ━━━━
// Runs 19 services in optimal parallel/sequential order
// Handles caching, error recovery, data quality gating, and audit logging

import { prisma } from '@/lib/prisma'

// ── v1 engines (carried forward) ──
import { runComparablesEngine } from '../comparables-engine'
import { runTrendEngine } from '../trend-engine'
import { runMarketSignalEngine } from '../market-signal-engine'
import { computeRentalIntelligence } from '../rule-engine'

// ── v2.1 services ──
import { runDataQualityEngine } from './data-quality-engine'
import { normalizePrice, denormalizePrice, countAmenities } from './normalized-price-engine'
import { computeMarketVolatilityIndex } from './market-volatility-index'
import { computeDemandIntelligence } from './demand-intelligence-engine'
import { computeHistoricalAccuracy } from './historical-accuracy-engine'
import { callMLService } from './ml-engine-client'
import { runFusionEngine } from './fusion-engine'
import { computeDistribution } from './distribution-engine'
import { computeConfidenceV2 } from './confidence-engine'
import { detectAnomalies } from './anomaly-engine'
import { computeRelativePosition } from './relative-position-engine'
import { generateExplanation } from './explanation-engine'
import { SOURCE_QUALITY_WEIGHTS } from './data-source-governance'

import type {
  PropertyInput,
  EntityType,
  VerixShieldResponseV2,
  ComparablesResultV2,
  ComparablePropertyV2,
  MLPrediction,
  NormalizationFactors,
  DataQualityResult,
  HistoricalAccuracyResult,
  MVIResult,
  DemandIntelligenceResult,
  TrendResult,
  MarketSignalResult,
} from '../types-v2'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const MODEL_VERSION = '2.1.0'

// ══════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════

export async function orchestrateV2(
  propertyId: string,
  entityType: EntityType,
): Promise<VerixShieldResponseV2> {
  const startTime = Date.now()
  const servicesUsed: string[] = []
  const errors: string[] = []

  // ── Step 1: Load property data ──
  const input = await loadPropertyInput(propertyId, entityType)
  if (!input) {
    throw new Error(`Property not found: ${propertyId} (${entityType})`)
  }

  // ── Step 2: Check PostgreSQL cache ──
  const cached = await getCachedResult(propertyId, entityType)
  if (cached) {
    return formatCachedResponse(cached, input)
  }

  // ── Step 3: Data Quality Gate ──
  servicesUsed.push('data_quality')
  const dataQuality = await runDataQualityEngine(
    input.city || null,
    input.community || null,
    input.bhk || 1,
  )

  // ── Step 4: Normalized Price (subject property factors) ──
  servicesUsed.push('normalized_price')
  const amenityCount = countAmenities(input.amenities)
  const rawPSF = input.price && input.sqft && input.sqft > 0 ? input.price / input.sqft : 0
  const normalization = normalizePrice(
    rawPSF || 1000, // fallback if no asking price
    input.floor || null,
    input.totalFloors || null,
    input.view || null,
    input.developerName || null,
    input.furnished || null,
    input.propertyAge || null,
    amenityCount,
  )

  // ── Step 5: Parallel batch — independent engines ──
  const [
    comparablesSettled,
    mlSettled,
    trendSettled,
    signalsSettled,
    mviSettled,
    demandSettled,
    historicalAccuracySettled,
  ] = await Promise.allSettled([
    runComparablesEngine(input).then(r => { servicesUsed.push('comparables'); return r }),
    callMLService(input, dataQuality, normalization.normalizedPricePerSqft).then(r => { servicesUsed.push('ml_engine'); return r }),
    runTrendEngine(input).then(r => { servicesUsed.push('trend'); return r }),
    runMarketSignalEngine(input).then(r => { servicesUsed.push('market_signals'); return r }),
    computeMarketVolatilityIndex(input.city || null, input.community || null).then(r => { servicesUsed.push('mvi'); return r }),
    computeDemandIntelligence(propertyId, input.city || null, input.community || null).then(r => { servicesUsed.push('demand_intel'); return r }),
    computeHistoricalAccuracy(input.city || null, input.community || null).then(r => { servicesUsed.push('historical_accuracy'); return r }),
  ])

  // ── Extract results with fallbacks ──
  const comparablesRaw = extractResult(comparablesSettled, {
    comparables: [], avgPricePerSqft: 0, medianPrice: 0, count: 0,
  }, errors, 'Comparables')

  const mlPrediction = extractResult<MLPrediction>(mlSettled, {
    predictedPrice: 0, predictedPricePerSqft: 0, predictionVariance: 0,
    featureImportances: {}, modelVersion: 'unavailable', modelSegment: 'none',
  }, errors, 'ML')

  const trends = extractResult<TrendResult>(trendSettled, {
    trend: [], overallChange: 0, direction: 'stable' as const,
  }, errors, 'Trends')

  const signals = extractResult<MarketSignalResult>(signalsSettled, {
    demandScore: 50, supplyScore: 50, listingVelocity: 0, avgDaysOnMarket: 0,
    dataPointCount: 0,
  }, errors, 'Signals')

  const mvi = extractResult<MVIResult>(mviSettled, {
    index: 1.0, classification: 'NORMAL' as const,
    factors: { priceVarianceTrend: 1, demandFluctuation: 1, transactionVelocityChange: 1 },
    effectiveThreshold: 15,
  }, errors, 'MVI')

  const demand = extractResult<DemandIntelligenceResult>(demandSettled, {
    score: 50, level: 'NORMAL' as const,
    signals: { viewCount: 0, saveCount: 0, enquiryCount: 0 },
    narrative: 'Demand data unavailable',
  }, errors, 'Demand')

  const historicalAccuracy = extractResult<HistoricalAccuracyResult>(historicalAccuracySettled, {
    score: 50, mape: null, sampleSize: 0, hasData: false, detail: 'Accuracy data unavailable',
  }, errors, 'HistoricalAccuracy')

  // ── Adapt v1 comparables to v2 format ──
  const comparables: ComparablesResultV2 = adaptComparables(comparablesRaw, normalization.adjustmentFactors)

  // ── Step 6: Sequential pipeline (each depends on prior results) ──

  // 6a: Fusion — blend comps + ML
  servicesUsed.push('fusion')
  const sqft = input.sqft || comparables.avgPricePerSqft > 0
    ? (input.sqft || 0) : 1000
  const fusion = runFusionEngine(comparables, mlPrediction, sqft)

  // 6b: Distribution — compute percentile bands
  servicesUsed.push('distribution')
  const distribution = computeDistribution(fusion, comparables, sqft)

  // 6c: Confidence — 7-factor score
  servicesUsed.push('confidence')
  const confidence = computeConfidenceV2(comparables, fusion, mlPrediction, dataQuality, historicalAccuracy)

  // 6d: Anomaly Detection — MVI-driven thresholds
  servicesUsed.push('anomaly')
  const anomaly = detectAnomalies(
    input.price || null, fusion, distribution, comparables, confidence, mvi,
  )

  // 6e: Relative Market Position
  servicesUsed.push('relative_position')
  const relativePosition = computeRelativePosition(input.price || null, comparables, distribution)

  // 6f: Rental Intelligence
  servicesUsed.push('rental')
  const rental = computeRentalIntelligence(input, {
    estimatedMin: distribution.p25,
    estimatedMax: distribution.p75,
    estimatedMedian: fusion.fusedPrice,
    confidence: confidence.score,
    confidenceReasons: confidence.reasons,
    modelVersion: MODEL_VERSION,
  })

  // 6g: Explanation Engine
  servicesUsed.push('explanation')
  const explanation = generateExplanation(
    fusion, comparables, confidence, anomaly, distribution, dataQuality, demand,
    normalization.adjustmentFactors,
  )

  // 6h: Negotiation Strategy
  const negotiation = buildNegotiationInsight(input, anomaly, fusion)

  // ── Step 7: Assemble response ──
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS)
  const computeTimeMs = Date.now() - startTime

  const response: VerixShieldResponseV2 = {
    propertyId: input.id,
    entityType: input.entityType,

    valuation: {
      low: distribution.p25,
      fair: fusion.fusedPrice,
      high: distribution.p75,
      confidence: confidence.score,
      confidenceGrade: confidence.grade,
      confidenceFactors: confidence.factors,
    },

    askingPrice: input.price || null,
    deviation: anomaly.deviation,
    status: anomaly.status,
    pricePosition: anomaly.pricePosition,

    trend: trends.trend,
    trendDirection: trends.direction,
    trendOverallChange: trends.overallChange,

    comparables: comparables.comparables,
    comparablesStats: {
      count: comparables.count,
      avgPricePerSqft: comparables.avgPricePerSqft,
      medianPrice: comparables.medianPrice,
      fallbackLevel: comparables.fallbackLevel,
    },

    distribution,
    rental,

    signals: {
      demandScore: signals.demandScore,
      supplyScore: signals.supplyScore || 50,
      listingVelocity: signals.listingVelocity,
      avgDaysOnMarket: signals.avgDaysOnMarket,
      inventoryMonths: signals.inventoryMonths || null,
      priceToRentRatio: signals.priceToRentRatio || null,
      dataPointCount: signals.dataPointCount,
    },

    negotiation: {
      suggestedMin: anomaly.suggestedMinPrice,
      suggestedMax: anomaly.suggestedMaxPrice,
      strategy: negotiation.strategy,
    },

    dataQuality,
    normalizedPricePerSqft: normalization.normalizedPricePerSqft,
    adjustmentFactors: normalization.adjustmentFactors,
    historicalAccuracy,
    marketVolatilityIndex: mvi,
    demandIntelligence: demand,
    relativePosition,
    explanation,

    fusion: {
      method: fusion.fusionMethod,
      compWeight: fusion.compWeight,
      mlWeight: fusion.mlWeight,
      modelSegment: fusion.modelSegment,
      reasons: fusion.fusionReasons,
    },

    meta: {
      computedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      modelVersion: MODEL_VERSION,
      cached: false,
      computeTimeMs,
    },
  }

  // ── Step 8: Cache result ──
  await cacheResult(input, response, expiresAt).catch(() => {})

  // ── Step 9: Audit log (fire-and-forget) ──
  logAudit(input, computeTimeMs, servicesUsed, errors, response).catch(() => {})

  return response
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function extractResult<T>(settled: PromiseSettledResult<T>, fallback: T, errors: string[], name: string): T {
  if (settled.status === 'fulfilled') return settled.value
  errors.push(`${name}: ${(settled as PromiseRejectedResult).reason?.message || 'unknown error'}`)
  return fallback
}

function adaptComparables(raw: any, subjectFactors: NormalizationFactors): ComparablesResultV2 {
  const comps: ComparablePropertyV2[] = (raw.comparables || []).map((c: any) => ({
    id: c.id,
    title: c.title || '',
    price: c.price || 0,
    pricePerSqft: c.pricePerSqft || 0,
    normalizedPricePerSqft: c.pricePerSqft || 0, // v1 comps don't have normalization
    sqft: c.sqft || 0,
    bhk: c.bhk || 0,
    city: c.city || '',
    community: c.community,
    distance: c.distance,
    source: c.source || 'INTERNAL',
    similarity: c.similarity || 50,
    recencyWeight: 0.8, // default for v1 comps
  }))

  const pricesPerSqft = comps.map((c: ComparablePropertyV2) => c.pricePerSqft).filter((p: number) => p > 0)
  const sorted = [...pricesPerSqft].sort((a, b) => a - b)

  const avg = sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0

  // Time-weighted: use source quality weights
  let weightedSum = 0
  let totalWeight = 0
  for (const comp of comps) {
    const sourceW = SOURCE_QUALITY_WEIGHTS[comp.source] || 0.5
    const w = (comp.similarity / 100) * comp.recencyWeight * sourceW
    weightedSum += comp.pricePerSqft * w
    totalWeight += w
  }
  const timeWeightedPSF = totalWeight > 0 ? weightedSum / totalWeight : avg

  return {
    comparables: comps,
    rawComparableCount: raw.count || comps.length,
    avgPricePerSqft: Math.round(avg),
    medianPricePerSqft: Math.round(median),
    weightedAvgPricePerSqft: Math.round(avg),
    timeWeightedPricePerSqft: Math.round(timeWeightedPSF),
    medianPrice: raw.medianPrice || Math.round(median * 1000),
    count: comps.length,
    fallbackLevel: 'community',
    pricePerSqftDistribution: sorted,
  }
}

// ── Property Loader (reuses v1 logic) ──

async function loadPropertyInput(id: string, entityType: EntityType): Promise<PropertyInput | null> {
  try {
    if (entityType === 'MANUAL_PROPERTY') {
      const prop = await (prisma as any).manualProperty.findUnique({
        where: { id },
        select: {
          id: true, title: true, price: true, currency: true,
          squareFeet: true, bedrooms: true, propertyType: true,
          city: true, community: true, latitude: true, longitude: true,
          amenities: true, propertyAge: true, createdAt: true,
        },
      })
      if (!prop) return null

      return {
        id: prop.id,
        entityType: 'MANUAL_PROPERTY',
        title: prop.title,
        price: prop.price,
        currency: prop.currency,
        sqft: prop.squareFeet,
        bhk: prop.bedrooms,
        propertyType: prop.propertyType,
        city: prop.city,
        community: prop.community,
        latitude: prop.latitude,
        longitude: prop.longitude,
        amenities: prop.amenities,
        propertyAge: prop.propertyAge || null,
        createdAt: prop.createdAt,
      }
    }

    if (entityType === 'PROJECT') {
      const project = await (prisma as any).project.findUnique({
        where: { id },
        include: {
          unitTypes: { include: { variants: true }, take: 10 },
          location: true,
          developer: true,
        },
      })
      if (!project) return null

      const allPrices: number[] = []
      const allSizes: number[] = []
      const allBedrooms: number[] = []

      for (const ut of project.unitTypes || []) {
        if (ut.bedrooms) allBedrooms.push(ut.bedrooms)
        if (ut.sizeFrom) allSizes.push(ut.sizeFrom)
        if (ut.sizeTo) allSizes.push(ut.sizeTo)
        if (ut.priceFrom) allPrices.push(ut.priceFrom)
        for (const v of ut.variants || []) {
          if (v.price) allPrices.push(v.price)
          if (v.size) allSizes.push(v.size)
        }
      }

      const avgPrice = allPrices.length > 0
        ? allPrices.reduce((s, v) => s + v, 0) / allPrices.length
        : project.startingPrice || null

      const avgSize = allSizes.length > 0
        ? allSizes.reduce((s, v) => s + v, 0) / allSizes.length
        : 0

      const medBhk = allBedrooms.length > 0
        ? allBedrooms.sort((a, b) => a - b)[Math.floor(allBedrooms.length / 2)]
        : 2

      return {
        id: project.id,
        entityType: 'PROJECT',
        title: project.name,
        price: avgPrice,
        currency: 'AED',
        sqft: avgSize,
        bhk: medBhk,
        propertyType: 'apartment',
        city: project.city,
        community: project.community,
        latitude: project.location?.latitude,
        longitude: project.location?.longitude,
        createdAt: project.createdAt,
        developerName: project.developer?.name || null,
      }
    }
    return null
  } catch (error) {
    console.error('[VerixShield:v2.1] Load error:', error)
    return null
  }
}

// ── Caching ──

async function getCachedResult(entityId: string, entityType: EntityType): Promise<any | null> {
  try {
    const result = await (prisma as any).verixShieldResult.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    })
    if (!result) return null
    if (new Date(result.expiresAt) < new Date()) return null
    return result
  } catch { return null }
}

function formatCachedResponse(cached: any, input: PropertyInput): VerixShieldResponseV2 {
  return {
    propertyId: input.id,
    entityType: input.entityType,
    valuation: {
      low: cached.estimatedMin,
      fair: cached.estimatedMedian,
      high: cached.estimatedMax,
      confidence: cached.confidence,
      confidenceGrade: cached.confidence >= 85 ? 'A' : cached.confidence >= 70 ? 'B' : cached.confidence >= 50 ? 'C' : cached.confidence >= 30 ? 'D' : 'F',
      confidenceFactors: [],
    },
    askingPrice: cached.askingPrice || input.price || null,
    deviation: cached.deviation,
    status: cached.status as any,
    pricePosition: cached.pricePosition || 50,
    trend: [], trendDirection: 'stable', trendOverallChange: 0,
    comparables: [],
    comparablesStats: {
      count: cached.comparablesCount,
      avgPricePerSqft: cached.avgPricePerSqft || 0,
      medianPrice: cached.medianPrice || 0,
      fallbackLevel: 'cached',
    },
    distribution: {
      min: cached.estimatedMin * 0.85, p10: cached.estimatedMin * 0.92,
      p25: cached.estimatedMin, median: cached.estimatedMedian,
      p75: cached.estimatedMax, p90: cached.estimatedMax * 1.08,
      max: cached.estimatedMax * 1.15, sampleSize: 0, method: 'synthetic',
    },
    rental: {
      estimatedRentalMin: cached.estimatedRentalMin || 0,
      estimatedRentalMax: cached.estimatedRentalMax || 0,
      rentalYield: cached.rentalYield || 0,
    },
    signals: {
      demandScore: cached.demandScore || 50, supplyScore: 50,
      listingVelocity: cached.listingVelocity || 0,
      avgDaysOnMarket: cached.avgDaysOnMarket || 0,
      dataPointCount: 0,
    },
    negotiation: {
      suggestedMin: cached.suggestedMinPrice || cached.estimatedMin,
      suggestedMax: cached.suggestedMaxPrice || cached.estimatedMedian,
      strategy: '',
    },
    dataQuality: { score: 50, status: 'MEDIUM', allowValuation: true, factors: [], recommendation: 'Cached result' },
    normalizedPricePerSqft: 0,
    adjustmentFactors: { floor: 1, view: 1, developer: 1, furnishing: 1, buildingQuality: 1, compositeFactor: 1 },
    historicalAccuracy: { score: 50, mape: null, sampleSize: 0, hasData: false, detail: 'Cached result' },
    marketVolatilityIndex: { index: 1, classification: 'NORMAL', factors: { priceVarianceTrend: 1, demandFluctuation: 1, transactionVelocityChange: 1 }, effectiveThreshold: 15 },
    demandIntelligence: { score: 50, level: 'NORMAL', signals: { viewCount: 0, saveCount: 0, enquiryCount: 0 }, narrative: '' },
    relativePosition: { percentile: 50, badge: 'Market Average', narrative: '', comparisonBase: 0 },
    explanation: { summary: 'Loaded from cache', dataPoints: 0, timeRange: '', medianPricePerSqft: 0, methodology: '', keyFactors: [], disclaimer: '' },
    fusion: { method: 'cached', compWeight: 0, mlWeight: 0, modelSegment: '', reasons: ['Served from cache'] },
    meta: {
      computedAt: cached.computedAt?.toISOString() || new Date().toISOString(),
      expiresAt: cached.expiresAt?.toISOString() || new Date().toISOString(),
      modelVersion: cached.modelVersion || MODEL_VERSION,
      cached: true,
    },
  }
}

async function cacheResult(input: PropertyInput, response: VerixShieldResponseV2, expiresAt: Date): Promise<void> {
  try {
    await (prisma as any).verixShieldResult.upsert({
      where: { entityType_entityId: { entityType: input.entityType, entityId: input.id } },
      update: {
        estimatedMin: response.valuation.low,
        estimatedMax: response.valuation.high,
        estimatedMedian: response.valuation.fair,
        confidence: response.valuation.confidence,
        confidenceReasons: response.valuation.confidenceFactors.map(f => f.reason),
        askingPrice: response.askingPrice,
        deviation: response.deviation,
        status: response.status === 'ABOVE_MARKET' ? 'OVERPRICED' : response.status === 'HIGH_RISK' ? 'SUSPICIOUS' : response.status,
        pricePosition: response.pricePosition,
        comparablesCount: response.comparablesStats.count,
        avgPricePerSqft: response.comparablesStats.avgPricePerSqft,
        medianPrice: response.comparablesStats.medianPrice,
        demandScore: response.signals.demandScore,
        listingVelocity: response.signals.listingVelocity,
        avgDaysOnMarket: response.signals.avgDaysOnMarket,
        estimatedRentalMin: response.rental.estimatedRentalMin,
        estimatedRentalMax: response.rental.estimatedRentalMax,
        rentalYield: response.rental.rentalYield,
        suggestedMinPrice: response.negotiation.suggestedMin,
        suggestedMaxPrice: response.negotiation.suggestedMax,
        modelVersion: MODEL_VERSION,
        computedAt: new Date(),
        expiresAt,
      },
      create: {
        entityType: input.entityType,
        entityId: input.id,
        estimatedMin: response.valuation.low,
        estimatedMax: response.valuation.high,
        estimatedMedian: response.valuation.fair,
        confidence: response.valuation.confidence,
        confidenceReasons: response.valuation.confidenceFactors.map(f => f.reason),
        askingPrice: response.askingPrice,
        deviation: response.deviation,
        status: response.status === 'ABOVE_MARKET' ? 'OVERPRICED' : response.status === 'HIGH_RISK' ? 'SUSPICIOUS' : response.status,
        pricePosition: response.pricePosition,
        comparablesCount: response.comparablesStats.count,
        avgPricePerSqft: response.comparablesStats.avgPricePerSqft,
        medianPrice: response.comparablesStats.medianPrice,
        demandScore: response.signals.demandScore,
        listingVelocity: response.signals.listingVelocity,
        avgDaysOnMarket: response.signals.avgDaysOnMarket,
        estimatedRentalMin: response.rental.estimatedRentalMin,
        estimatedRentalMax: response.rental.estimatedRentalMax,
        rentalYield: response.rental.rentalYield,
        suggestedMinPrice: response.negotiation.suggestedMin,
        suggestedMaxPrice: response.negotiation.suggestedMax,
        modelVersion: MODEL_VERSION,
        computedAt: new Date(),
        expiresAt,
      },
    })
  } catch (error) {
    console.error('[VerixShield:v2.1] Cache error:', error)
  }
}

// ── Negotiation ──

function buildNegotiationInsight(
  input: PropertyInput,
  anomaly: { status: string; deviation: number; suggestedMinPrice: number; suggestedMaxPrice: number },
  fusion: { fusedPrice: number },
) {
  let strategy = ''
  if (anomaly.status === 'ABOVE_MARKET') {
    const saved = (input.price || 0) - fusion.fusedPrice
    strategy = `This property appears to be above fair market value. A reasonable offer would be AED ${formatCompact(anomaly.suggestedMinPrice)} - ${formatCompact(anomaly.suggestedMaxPrice)}, potentially saving AED ${formatCompact(Math.abs(saved))}.`
  } else if (anomaly.status === 'UNDERPRICED') {
    strategy = `Priced ${Math.abs(anomaly.deviation).toFixed(1)}% below market. This could be a strong buying opportunity — act quickly.`
  } else if (anomaly.status === 'HIGH_RISK') {
    strategy = `Significantly below market (${Math.abs(anomaly.deviation).toFixed(1)}%). Verify listing details, legal status, and documentation.`
  } else if (anomaly.status === 'FAIR') {
    strategy = `Fairly priced — aligns with comparable properties. Negotiation target: AED ${formatCompact(anomaly.suggestedMinPrice)} - ${formatCompact(anomaly.suggestedMaxPrice)}.`
  } else {
    strategy = 'Insufficient data for a negotiation recommendation. Consider an independent valuation.'
  }
  return { strategy }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toFixed(0)
}

// ── Audit ──

async function logAudit(
  input: PropertyInput,
  durationMs: number,
  servicesUsed: string[],
  errors: string[],
  response: VerixShieldResponseV2,
): Promise<void> {
  try {
    await (prisma as any).verixShieldAuditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.id,
        trigger: 'api_request',
        durationMs,
        servicesUsed,
        inputSnapshot: {
          price: input.price, sqft: input.sqft, bhk: input.bhk,
          city: input.city, community: input.community,
        },
        resultSnapshot: {
          status: response.status,
          confidence: response.valuation.confidence,
          deviation: response.deviation,
          comparablesCount: response.comparablesStats.count,
          dataQualityScore: response.dataQuality.score,
          fusionMethod: response.fusion.method,
        },
        hadErrors: errors.length > 0,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch {}
}
