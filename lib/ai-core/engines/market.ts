// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AIMarket Engine
// Volume 3: AI/ML Pipeline — Engine: MARKET
//
// Computes micromarket-level intelligence for any city/community pair:
//   - Market Heat Mapping
//   - Supply/Demand Balance
//   - Price Movement Analytics
//   - Rental Market Intelligence
//   - Investment Opportunity Windows
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { FeatureVector } from '../feature-store'
import type { EntityType, MarketHeat } from '../types'

const ENGINE_VERSION = '2.0.0'

export interface MarketReport {
  marketKey: string
  city: string
  community?: string
  countryIso2: string
  
  // Current state
  marketHeat: MarketHeat
  demandIndex: number           // 0-100
  supplyIndex: number           // 0-100
  inventoryMonths: number
  absorptionRate: number
  
  // Pricing
  avgPricePerSqft: number
  medianPrice: number
  priceChangeMomPct: number
  priceChangeYoyPct: number
  priceChangeQoqPct: number
  
  // Investment
  rentalYieldAvg: number
  capitalAppreciation3yr: number
  priceToRentRatio: number
  
  // Activity
  newListingsCount: number
  transactionsCount: number
  
  // Trend
  trend: {
    period: string
    avgPricePerSqft: number
    transactionCount: number
    priceChangePercent?: number
  }[]
  
  // Data quality
  dataQualityScore: number
  sampleSize: number
  lastUpdated: string
}

interface EngineOptions {
  forceRefresh?: boolean
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runMarketEngine(
  entityId: string,
  entityType: EntityType,
  features: FeatureVector | null,
  _options: EngineOptions = {}
): Promise<MarketReport | null> {
  // Resolve market key from features / property data
  const { city, community, countryIso2 } = await resolveLocation(entityId, entityType)
  if (!city) return null

  const marketKey = community
    ? `${countryIso2}:${city}:${community}`
    : `${countryIso2}:${city}`

  return getMarketReport(marketKey, city, community, countryIso2)
}

// ─── Standalone Market Report (callable by city/community) ───────────────────

export async function getMarketReport(
  marketKey: string,
  city: string,
  community: string | null | undefined,
  countryIso2: string
): Promise<MarketReport | null> {
  // Load latest snapshot
  const snapshot = await prisma.marketSnapshot.findFirst({
    where: { marketKey: { startsWith: marketKey } },
    orderBy: { snapshotDate: 'desc' },
  })

  // Load trend data (last 12 months)
  const trendSnapshots = await prisma.marketSnapshot.findMany({
    where: { marketKey: { startsWith: marketKey } },
    orderBy: { snapshotDate: 'asc' },
    take: 12,
    select: {
      snapshotDate: true,
      avgPricePerSqft: true,
      transactionsCount: true,
      priceChangeMomPct: true,
    },
  })

  // If no snapshot data yet, build a synthetic report from platform data
  if (!snapshot) {
    return buildSyntheticMarketReport(city, community, countryIso2, marketKey)
  }

  return {
    marketKey,
    city,
    community: community ?? undefined,
    countryIso2,
    marketHeat: snapshot.marketHeat as MarketHeat,
    demandIndex: snapshot.demandIndex,
    supplyIndex: snapshot.supplyIndex,
    inventoryMonths: snapshot.inventoryMonths,
    absorptionRate: snapshot.absorptionRate,
    avgPricePerSqft: snapshot.avgPricePerSqft,
    medianPrice: snapshot.medianTotalPrice,
    priceChangeMomPct: snapshot.priceChangeMomPct,
    priceChangeYoyPct: snapshot.priceChangeYoyPct,
    priceChangeQoqPct: snapshot.priceChangeQoqPct,
    rentalYieldAvg: snapshot.rentalYieldAvg ?? 5.5,
    capitalAppreciation3yr: snapshot.capitalAppreciation3yr ?? 5.0,
    priceToRentRatio: snapshot.priceToRentRatio ?? 20,
    newListingsCount: snapshot.newListingsCount,
    transactionsCount: snapshot.transactionsCount,
    trend: trendSnapshots.map(s => ({
      period: s.snapshotDate.toISOString().substring(0, 7),
      avgPricePerSqft: s.avgPricePerSqft,
      transactionCount: s.transactionsCount,
      priceChangePercent: s.priceChangeMomPct,
    })),
    dataQualityScore: snapshot.dataQualityScore,
    sampleSize: snapshot.sampleSize,
    lastUpdated: snapshot.computedAt.toISOString(),
  }
}

// ─── Synthetic Market Report (from platform data, before external ingestion) ──

async function buildSyntheticMarketReport(
  city: string,
  community: string | null | undefined,
  countryIso2: string,
  marketKey: string
): Promise<MarketReport | null> {
  // Aggregate from ManualProperty data in our platform
  const properties = await prisma.manualProperty.findMany({
    where: {
      countryIso2,
      city: { contains: city, mode: 'insensitive' },
      ...(community ? { community: { contains: community, mode: 'insensitive' } } : {}),
      status: 'APPROVED',
      price: { not: null },
      squareFeet: { gt: 0 },
    },
    select: {
      price: true,
      squareFeet: true,
      bedrooms: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 200,
  })

  if (properties.length < 3) return null

  const pricesPerSqft = properties
    .filter(p => p.price && p.squareFeet > 0)
    .map(p => p.price! / p.squareFeet)

  const avgPricePerSqft = pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length
  const sortedPrices = [...pricesPerSqft].sort((a, b) => a - b)
  const mid = Math.floor(sortedPrices.length / 2)
  const medianPricePerSqft = sortedPrices.length % 2 === 0
    ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2
    : sortedPrices[mid]

  // Count recent listings (last 90 days)
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const recentCount = properties.filter(p => p.createdAt >= cutoff90).length

  // Compute synthetic demand/supply from recency and volume
  const demandIndex = Math.min(100, Math.round((recentCount / Math.max(1, properties.length)) * 300))
  const supplyIndex = Math.min(100, Math.round(properties.length / 2))

  return {
    marketKey,
    city,
    community: community ?? undefined,
    countryIso2,
    marketHeat: classifyHeat(demandIndex, supplyIndex),
    demandIndex,
    supplyIndex,
    inventoryMonths: supplyIndex > 0 ? Math.round(supplyIndex / Math.max(1, demandIndex / 10)) : 12,
    absorptionRate: Math.max(1, recentCount / 3),
    avgPricePerSqft: Math.round(avgPricePerSqft),
    medianPrice: Math.round(medianPricePerSqft * 1000), // approximate based on 1000sqft unit
    priceChangeMomPct: 0,
    priceChangeYoyPct: 0,
    priceChangeQoqPct: 0,
    rentalYieldAvg: 5.5, // default — will be replaced by real data
    capitalAppreciation3yr: 5.0,
    priceToRentRatio: 20,
    newListingsCount: recentCount,
    transactionsCount: 0, // platform doesn't have transaction data yet
    trend: [],
    dataQualityScore: Math.min(60, properties.length * 2), // low quality — synthetic
    sampleSize: properties.length,
    lastUpdated: new Date().toISOString(),
  }
}

// ─── Market Heat Classifier ───────────────────────────────────────────────────

function classifyHeat(demandIndex: number, supplyIndex: number): MarketHeat {
  const ratio = supplyIndex > 0 ? demandIndex / supplyIndex : demandIndex / 50
  if (ratio > 1.8) return 'VERY_HOT'
  if (ratio > 1.4) return 'HOT'
  if (ratio > 1.1) return 'WARM'
  if (ratio > 0.9) return 'NEUTRAL'
  if (ratio > 0.7) return 'COOL'
  if (ratio > 0.5) return 'COLD'
  return 'VERY_COLD'
}

// ─── Location Resolver ────────────────────────────────────────────────────────

async function resolveLocation(entityId: string, entityType: EntityType) {
  if (entityType === 'MANUAL_PROPERTY') {
    const prop = await prisma.manualProperty.findUnique({
      where: { id: entityId },
      select: { city: true, community: true, countryIso2: true },
    })
    return { city: prop?.city ?? null, community: prop?.community, countryIso2: prop?.countryIso2 ?? 'AE' }
  }

  if (entityType === 'PROJECT') {
    const proj = await prisma.project.findUnique({
      where: { id: entityId },
      select: { city: true, community: true, countryIso2: true },
    })
    return { city: proj?.city ?? null, community: proj?.community, countryIso2: proj?.countryIso2 ?? 'AE' }
  }

  return { city: null, community: null, countryIso2: 'AE' }
}
