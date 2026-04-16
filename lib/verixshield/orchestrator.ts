// ━━━ VerixShield Orchestrator Service (Main Controller) ━━━━━━━━━━━━━━━━━━
// Aggregates outputs from all service engines
// Handles caching, error recovery, and unified response assembly

import { prisma } from '@/lib/prisma'
import { runValuationEngine } from './valuation-engine'
import { runComparablesEngine } from './comparables-engine'
import { runTrendEngine } from './trend-engine'
import { runMarketSignalEngine } from './market-signal-engine'
import { runRuleEngine, computeRentalIntelligence, computePriceDistribution } from './rule-engine'
import type { PropertyInput, VerixShieldResponse, EntityType, ValuationResult } from './types'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 hours
const MODEL_VERSION = '1.0.0'

export async function orchestrate(propertyId: string, entityType: EntityType): Promise<VerixShieldResponse> {
  const startTime = Date.now()
  const servicesUsed: string[] = []
  const errors: string[] = []

  // ── Step 1: Load property data ──
  const input = await loadPropertyInput(propertyId, entityType)
  if (!input) {
    throw new Error(`Property not found: ${propertyId} (${entityType})`)
  }

  // ── Step 2: Check cache ──
  const cached = await getCachedResult(propertyId, entityType)
  if (cached) {
    return formatCachedResponse(cached, input)
  }

  // ── Step 3: Run all engines in parallel ──
  const [
    valuationResult,
    comparablesResult,
    trendResult,
    signalsResult,
  ] = await Promise.allSettled([
    runValuationEngine(input).then(r => { servicesUsed.push('valuation'); return r }),
    runComparablesEngine(input).then(r => { servicesUsed.push('comparables'); return r }),
    runTrendEngine(input).then(r => { servicesUsed.push('trend'); return r }),
    runMarketSignalEngine(input).then(r => { servicesUsed.push('market_signals'); return r }),
  ])

  // Extract results with fallbacks
  const valuation = valuationResult.status === 'fulfilled'
    ? valuationResult.value
    : (() => {
        errors.push(`Valuation: ${(valuationResult as any).reason?.message || 'unknown error'}`)
        return {
          estimatedMin: 0, estimatedMax: 0, estimatedMedian: 0,
          confidence: 0, confidenceReasons: ['Valuation engine unavailable'],
          modelVersion: MODEL_VERSION,
        }
      })()

  const comparables = comparablesResult.status === 'fulfilled'
    ? comparablesResult.value
    : (() => {
        errors.push(`Comparables: ${(comparablesResult as any).reason?.message || 'unknown error'}`)
        return { comparables: [], avgPricePerSqft: 0, medianPrice: 0, count: 0 }
      })()

  const trends = trendResult.status === 'fulfilled'
    ? trendResult.value
    : (() => {
        errors.push(`Trends: ${(trendResult as any).reason?.message || 'unknown error'}`)
        return { trend: [], overallChange: 0, direction: 'stable' as const }
      })()

  const signals = signalsResult.status === 'fulfilled'
    ? signalsResult.value
    : (() => {
        errors.push(`Signals: ${(signalsResult as any).reason?.message || 'unknown error'}`)
        return { demandScore: 50, supplyScore: 50, listingVelocity: 0, avgDaysOnMarket: 0, inventoryMonths: null, priceToRentRatio: null, dataPointCount: 0 }
      })()

  // ── Step 4: Run rule engine (synchronous, depends on valuation + comparables) ──
  servicesUsed.push('rule_engine')
  const ruleResult = runRuleEngine(input, valuation, comparables)

  // ── Step 5: Compute rental intelligence ──
  servicesUsed.push('rental')
  const rental = computeRentalIntelligence(input, valuation)

  // ── Step 6: Compute distribution ──
  const distribution = computePriceDistribution(valuation, comparables)

  // ── Step 7: Build negotiation strategy ──
  const negotiation = buildNegotiationInsight(input, valuation, ruleResult)

  // ── Step 8: Assemble response ──
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS)

  const response: VerixShieldResponse = {
    propertyId: input.id,
    entityType: input.entityType,

    valuation: {
      min: valuation.estimatedMin,
      max: valuation.estimatedMax,
      median: valuation.estimatedMedian,
      confidence: valuation.confidence,
      confidenceReasons: valuation.confidenceReasons,
    },

    askingPrice: input.price || null,
    deviation: ruleResult.deviation,
    status: ruleResult.status,
    pricePosition: ruleResult.pricePosition,

    trend: trends.trend,
    trendDirection: trends.direction,
    trendOverallChange: trends.overallChange,

    comparables: comparables.comparables,
    comparablesStats: {
      count: comparables.count,
      avgPricePerSqft: comparables.avgPricePerSqft,
      medianPrice: comparables.medianPrice,
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
      suggestedMin: ruleResult.suggestedMinPrice,
      suggestedMax: ruleResult.suggestedMaxPrice,
      strategy: negotiation.strategy,
    },

    meta: {
      computedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      modelVersion: MODEL_VERSION,
      cached: false,
    },
  }

  // ── Step 9: Store in cache ──
  await cacheResult(input, response, expiresAt)

  // ── Step 10: Audit log ──
  const durationMs = Date.now() - startTime
  await logAudit(input, durationMs, servicesUsed, errors, response)

  return response
}

// ━━━ Data Loaders ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadPropertyInput(id: string, entityType: EntityType): Promise<PropertyInput | null> {
  try {
    if (entityType === 'MANUAL_PROPERTY') {
      const prop = await (prisma as any).manualProperty.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          squareFeet: true,
          bedrooms: true,
          propertyType: true,
          city: true,
          community: true,
          latitude: true,
          longitude: true,
          amenities: true,
          createdAt: true,
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
        createdAt: prop.createdAt,
      }
    }

    if (entityType === 'PROJECT') {
      const project = await (prisma as any).project.findUnique({
        where: { id },
        include: {
          unitTypes: {
            include: { variants: true },
            take: 10,
          },
          location: true,
        },
      })

      if (!project) return null

      // Derive price from unit variants
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
      }
    }

    return null
  } catch (error) {
    console.error('[VerixShield:Orchestrator] Load error:', error)
    return null
  }
}

// ━━━ Caching ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getCachedResult(entityId: string, entityType: EntityType): Promise<any | null> {
  try {
    const result = await (prisma as any).verixShieldResult.findUnique({
      where: {
        entityType_entityId: { entityType, entityId },
      },
    })

    if (!result) return null

    // Check expiry
    if (new Date(result.expiresAt) < new Date()) {
      return null  // Expired
    }

    return result
  } catch {
    return null
  }
}

function formatCachedResponse(cached: any, input: PropertyInput): VerixShieldResponse {
  return {
    propertyId: input.id,
    entityType: input.entityType,
    valuation: {
      min: cached.estimatedMin,
      max: cached.estimatedMax,
      median: cached.estimatedMedian,
      confidence: cached.confidence,
      confidenceReasons: cached.confidenceReasons || [],
    },
    askingPrice: cached.askingPrice || input.price || null,
    deviation: cached.deviation,
    status: cached.status,
    pricePosition: cached.pricePosition || 50,
    trend: [],
    trendDirection: 'stable',
    trendOverallChange: 0,
    comparables: [],
    comparablesStats: {
      count: cached.comparablesCount,
      avgPricePerSqft: cached.avgPricePerSqft || 0,
      medianPrice: cached.medianPrice || 0,
    },
    distribution: {
      min: cached.estimatedMin * 0.85,
      p10: cached.estimatedMin * 0.92,
      p25: cached.estimatedMin,
      median: cached.estimatedMedian,
      p75: cached.estimatedMax,
      p90: cached.estimatedMax * 1.08,
      max: cached.estimatedMax * 1.15,
    },
    rental: {
      estimatedRentalMin: cached.estimatedRentalMin || 0,
      estimatedRentalMax: cached.estimatedRentalMax || 0,
      rentalYield: cached.rentalYield || 0,
    },
    signals: {
      demandScore: cached.demandScore || 50,
      supplyScore: 50,
      listingVelocity: cached.listingVelocity || 0,
      avgDaysOnMarket: cached.avgDaysOnMarket || 0,
      inventoryMonths: null,
      priceToRentRatio: null,
      dataPointCount: 0,
    },
    negotiation: {
      suggestedMin: cached.suggestedMinPrice || cached.estimatedMin,
      suggestedMax: cached.suggestedMaxPrice || cached.estimatedMedian,
      strategy: '',
    },
    meta: {
      computedAt: cached.computedAt?.toISOString() || new Date().toISOString(),
      expiresAt: cached.expiresAt?.toISOString() || new Date().toISOString(),
      modelVersion: cached.modelVersion || MODEL_VERSION,
      cached: true,
    },
  }
}

async function cacheResult(input: PropertyInput, response: VerixShieldResponse, expiresAt: Date): Promise<void> {
  try {
    await (prisma as any).verixShieldResult.upsert({
      where: {
        entityType_entityId: {
          entityType: input.entityType,
          entityId: input.id,
        },
      },
      update: {
        estimatedMin: response.valuation.min,
        estimatedMax: response.valuation.max,
        estimatedMedian: response.valuation.median,
        confidence: response.valuation.confidence,
        confidenceReasons: response.valuation.confidenceReasons,
        askingPrice: response.askingPrice,
        deviation: response.deviation,
        status: response.status,
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
        estimatedMin: response.valuation.min,
        estimatedMax: response.valuation.max,
        estimatedMedian: response.valuation.median,
        confidence: response.valuation.confidence,
        confidenceReasons: response.valuation.confidenceReasons,
        askingPrice: response.askingPrice,
        deviation: response.deviation,
        status: response.status,
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
    console.error('[VerixShield:Cache] Error storing result:', error)
  }
}

// ━━━ Negotiation Logic ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildNegotiationInsight(
  input: PropertyInput,
  valuation: ValuationResult,
  rule: { status: string; deviation: number; suggestedMinPrice: number; suggestedMaxPrice: number },
) {
  let strategy = ''

  if (rule.status === 'OVERPRICED') {
    const savedAmount = (input.price || 0) - valuation.estimatedMedian
    strategy = `This property appears to be above fair market value. Based on comparable analysis, a reasonable offer would be between AED ${formatCompact(rule.suggestedMinPrice)} - ${formatCompact(rule.suggestedMaxPrice)}, potentially saving AED ${formatCompact(Math.abs(savedAmount))}.`
  } else if (rule.status === 'UNDERPRICED') {
    strategy = `This property is priced below market value by approximately ${Math.abs(rule.deviation).toFixed(1)}%. This could be a strong buying opportunity. Consider acting quickly as below-market listings attract multiple offers.`
  } else if (rule.status === 'SUSPICIOUS') {
    strategy = `Exercise caution — this listing is priced significantly below market value (${Math.abs(rule.deviation).toFixed(1)}% below). Verify the listing details, legal status, and documentation before proceeding.`
  } else if (rule.status === 'FAIR') {
    strategy = `This property is priced within the fair market range. The asking price aligns well with comparable properties in this area. A reasonable negotiation target would be AED ${formatCompact(rule.suggestedMinPrice)} - ${formatCompact(rule.suggestedMaxPrice)}.`
  } else {
    strategy = 'Insufficient data to provide a negotiation recommendation. Consider getting an independent valuation.'
  }

  return { strategy }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toFixed(0)
}

// ━━━ Audit Logging ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function logAudit(
  input: PropertyInput,
  durationMs: number,
  servicesUsed: string[],
  errors: string[],
  response: VerixShieldResponse,
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
          price: input.price,
          sqft: input.sqft,
          bhk: input.bhk,
          city: input.city,
          community: input.community,
        },
        resultSnapshot: {
          status: response.status,
          confidence: response.valuation.confidence,
          deviation: response.deviation,
          comparablesCount: response.comparablesStats.count,
        },
        hadErrors: errors.length > 0,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch {
    // Non-critical
  }
}
