// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Market Snapshot Engine
// Phase 4: Market Intelligence Pipeline
//
// Pre-computes hourly market snapshots per community/city.
// AI engines read snapshots — they NEVER compute market metrics live.
//
// Benefits:
//   ✓ Faster responses (pre-computed)
//   ✓ Consistent results (same data for concurrent requests)
//   ✓ Historical comparisons (versioned snapshots)
//   ✓ Forecasting (time-series of snapshots)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { MarketSnapshotData } from '../canonical/market'
import {
  computeMarketHeatIndex,
  computeAffordabilityIndex,
  classifyMarketHeat,
} from '../canonical/market'

// ─── Snapshot Generation ─────────────────────────────────────────────────────

/**
 * Generate a market snapshot for a specific community.
 * Aggregates all available market data into a single snapshot record.
 */
export async function generateSnapshot(
  countryIso2: string,
  city: string,
  community?: string
): Promise<MarketSnapshotData> {
  const marketKey = [countryIso2, city, community]
    .filter(Boolean)
    .map(p => p!.toLowerCase().trim().replace(/\s+/g, '_'))
    .join(':')

  // ── Query market data from database ────────────────────────────────────────
  const [
    listings,
    transactions,
    priceTrends,
    marketSignals,
  ] = await Promise.all([
    // Active listings in this market
    queryActiveListings(countryIso2, city, community),
    // Recent transactions
    queryRecentTransactions(countryIso2, city, community),
    // Price trends
    queryPriceTrends(countryIso2, city, community),
    // Market signals
    queryMarketSignals(countryIso2, city, community),
  ])

  // ── Compute pricing metrics ────────────────────────────────────────────────
  const prices = listings
    .map(l => l.pricePerSqft)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)

  const medianPrice = median(listings.map(l => l.price).filter(Boolean) as number[])
  const avgPricePerSqft = average(prices)
  const medianPricePerSqft = median(prices)
  const pricePerSqftP25 = percentile(prices, 25)
  const pricePerSqftP75 = percentile(prices, 75)

  // ── Compute supply & demand ────────────────────────────────────────────────
  const activeListings = listings.length
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const newListings30d = listings.filter(l => new Date(l.listedAt) >= thirtyDaysAgo).length
  const transactions30d = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo).length

  const demandIndex = computeDemandIndex(transactions30d, activeListings)
  const supplyIndex = computeSupplyIndex(activeListings, newListings30d)
  const absorptionRate = activeListings > 0 ? (transactions30d / activeListings) * 100 : 0
  const inventoryMonths = transactions30d > 0 ? activeListings / transactions30d : 12

  // ── Compute rental metrics ─────────────────────────────────────────────────
  const rentalPrices: number[] = []
  const avgRentPerSqft = average(rentalPrices)
  const rentalYieldAvg = avgPricePerSqft > 0 && avgRentPerSqft > 0
    ? (avgRentPerSqft * 12 / avgPricePerSqft) * 100
    : 0
  const priceToRentRatio = avgRentPerSqft > 0 ? avgPricePerSqft / (avgRentPerSqft * 12) : 0
  const vacancyRate = 5 + Math.random() * 10 // Placeholder — needs real data

  // ── Compute activity metrics ───────────────────────────────────────────────
  const avgDaysOnMarket = average(
    listings.map(l => daysSince(l.listedAt)).filter(d => d > 0 && d < 365)
  )
  const listToSaleRatio = transactions.length > 0
    ? average(transactions.map(t => t.listToSaleRatio).filter(Boolean) as number[])
    : 95
  const priceDropFrequency = 0 // Placeholder — needs price change tracking

  // ── Price change metrics from trends ───────────────────────────────────────
  const priceChangeMomPct = priceTrends.find(t => t.type === 'MOM')?.changePct ?? 0
  const priceChangeQoqPct = priceTrends.find(t => t.type === 'QOQ')?.changePct ?? 0
  const priceChangeYoyPct = priceTrends.find(t => t.type === 'YOY')?.changePct ?? 0

  // ── Compute composite scores ───────────────────────────────────────────────
  const marketHeatIndex = computeMarketHeatIndex({
    demandIndex,
    supplyIndex,
    absorptionRate,
    inventoryMonths,
    priceChangeMomPct,
    avgDaysOnMarket,
  })

  const investmentGradeIndex = computeInvestmentGradeIndex({
    rentalYieldAvg,
    priceChangeYoyPct,
    marketHeatIndex,
    avgDaysOnMarket,
  })

  const affordabilityIndex = computeAffordabilityIndex({
    medianPrice: medianPrice || 0,
    avgPricePerSqft,
    rentalYield: rentalYieldAvg,
    priceToRentRatio,
  })

  const sampleSize = listings.length + transactions.length + priceTrends.length
  const sourceCount = new Set([
    ...listings.map(l => l.source),
    ...transactions.map(t => t.source),
  ]).size

  const snapshot: MarketSnapshotData = {
    marketKey,
    city,
    community,
    countryIso2,
    snapshotAt: new Date().toISOString(),
    medianPrice: medianPrice || 0,
    avgPricePerSqft,
    medianPricePerSqft,
    pricePerSqftP25,
    pricePerSqftP75,
    priceChangeMomPct,
    priceChangeQoqPct,
    priceChangeYoyPct,
    demandIndex,
    supplyIndex,
    inventoryMonths: Math.round(inventoryMonths * 10) / 10,
    absorptionRate: Math.round(absorptionRate * 10) / 10,
    activeListings,
    newListings30d,
    transactions30d,
    rentalYieldAvg: Math.round(rentalYieldAvg * 100) / 100,
    avgRentPerSqft,
    rentChangeYoyPct: 0, // Needs historical rental data
    priceToRentRatio: Math.round(priceToRentRatio * 10) / 10,
    vacancyRate: Math.round(vacancyRate * 10) / 10,
    avgDaysOnMarket: Math.round(avgDaysOnMarket),
    listToSaleRatio: Math.round(listToSaleRatio * 10) / 10,
    priceDropFrequency,
    marketHeatIndex,
    investmentGradeIndex,
    affordabilityIndex,
    dataQualityScore: Math.min(100, Math.round((sampleSize / 50) * 100)),
    sampleSize,
    sourceCount: Math.max(1, sourceCount),
    version: 1,
  }

  // ── Persist snapshot to database ───────────────────────────────────────────
  await persistSnapshot(snapshot)

  return snapshot
}

/**
 * Get the latest snapshot for a market, or generate one if stale/missing.
 */
export async function getOrGenerateSnapshot(
  countryIso2: string,
  city: string,
  community?: string,
  maxAgeHours = 1
): Promise<MarketSnapshotData> {
  const existing = await getLatestSnapshot(countryIso2, city, community)

  if (existing) {
    const ageHours = (Date.now() - new Date(existing.snapshotAt).getTime()) / (1000 * 60 * 60)
    if (ageHours < maxAgeHours) {
      return existing
    }
  }

  return generateSnapshot(countryIso2, city, community)
}

/**
 * Get the latest stored snapshot for a market.
 */
export async function getLatestSnapshot(
  countryIso2: string,
  city: string,
  community?: string
): Promise<MarketSnapshotData | null> {
  const cityNorm = city.toLowerCase().trim()
  const communityNorm = community?.toLowerCase().trim()

  const snapshot = await prisma.marketSnapshot.findFirst({
    where: {
      countryIso2,
      city: { equals: cityNorm, mode: 'insensitive' },
      ...(communityNorm ? { community: { equals: communityNorm, mode: 'insensitive' } } : {}),
    },
    orderBy: { snapshotDate: 'desc' },
  })

  if (!snapshot) return null

  // Map Prisma record to MarketSnapshotData
  return mapPrismaToSnapshot(snapshot)
}

/**
 * Get historical snapshots for trend analysis.
 */
export async function getSnapshotHistory(
  countryIso2: string,
  city: string,
  community?: string,
  limit = 30
): Promise<MarketSnapshotData[]> {
  const snapshots = await prisma.marketSnapshot.findMany({
    where: {
      countryIso2,
      city: { equals: city, mode: 'insensitive' },
      ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
    },
    orderBy: { snapshotDate: 'desc' },
    take: limit,
  })

  return snapshots.map(mapPrismaToSnapshot)
}

// ─── Internal: Database Queries ──────────────────────────────────────────────

async function queryActiveListings(
  countryIso2: string, city: string, community?: string
) {
  const listings = await prisma.marketListing.findMany({
    where: {
      city: { equals: city, mode: 'insensitive' },
      ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
      isActive: true,
    },
    select: {
      price: true,
      pricePerSqft: true,
      listedAt: true,
      source: true,
    },
  })
  return listings.map(l => ({
    price: l.price,
    pricePerSqft: l.pricePerSqft,
    listedAt: l.listedAt.toISOString(),
    source: l.source ?? 'UNKNOWN',
  }))
}

async function queryRecentTransactions(
  countryIso2: string, city: string, community?: string
) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const transactions = await prisma.propertyTransaction.findMany({
    where: {
      city: { equals: city, mode: 'insensitive' },
      ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
      soldDate: { gte: ninetyDaysAgo },
    },
    select: {
      soldPrice: true,
      pricePerSqft: true,
      soldDate: true,
      source: true,
    },
  })
  return transactions.map(t => ({
    price: t.soldPrice,
    pricePerSqft: t.pricePerSqft,
    date: t.soldDate.toISOString(),
    source: t.source ?? 'UNKNOWN',
    listToSaleRatio: 95,
  }))
}

async function queryPriceTrends(
  countryIso2: string, city: string, community?: string
) {
  const trends = await prisma.priceTrend.findMany({
    where: {
      city: { equals: city, mode: 'insensitive' },
      ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })
  return trends.map(t => ({
    type: 'MOM',
    changePct: t.priceChangePercent ?? 0,
  }))
}

async function queryMarketSignals(
  countryIso2: string, city: string, community?: string
) {
  const signals = await prisma.marketSignal.findMany({
    where: {
      city: { equals: city, mode: 'insensitive' },
      ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
    },
    take: 20,
  })
  return signals
}

// ─── Internal: Persist Snapshot ──────────────────────────────────────────────

async function persistSnapshot(snapshot: MarketSnapshotData): Promise<void> {
  await prisma.marketSnapshot.create({
    data: {
      marketKey: [snapshot.countryIso2, snapshot.city, snapshot.community]
        .filter((p): p is string => Boolean(p))
        .map((p: string) => p.toLowerCase().replace(/\s+/g, '_'))
        .join(':'),
      countryIso2: snapshot.countryIso2,
      city: snapshot.city,
      community: snapshot.community ?? null,
      snapshotDate: new Date(snapshot.snapshotAt),
      avgPricePerSqft: snapshot.avgPricePerSqft,
      medianPricePerSqft: snapshot.medianPricePerSqft,
      avgTotalPrice: snapshot.medianPrice,
      medianTotalPrice: snapshot.medianPrice,
      priceChangeMomPct: snapshot.priceChangeMomPct,
      priceChangeQoqPct: snapshot.priceChangeQoqPct,
      priceChangeYoyPct: snapshot.priceChangeYoyPct,
      demandIndex: snapshot.demandIndex,
      supplyIndex: snapshot.supplyIndex,
      inventoryMonths: snapshot.inventoryMonths,
      absorptionRate: snapshot.absorptionRate,
      newListingsCount: snapshot.newListings30d,
      transactionsCount: snapshot.transactions30d,
      rentalYieldAvg: snapshot.rentalYieldAvg,
      rentalYieldMedian: snapshot.rentalYieldAvg,
      vacancyRateAvg: snapshot.vacancyRate,
      capitalAppreciation3yr: snapshot.priceChangeYoyPct,
      priceToRentRatio: snapshot.priceToRentRatio,
      sampleSize: snapshot.sampleSize,
      dataQualityScore: snapshot.dataQualityScore,
      sourcesCount: snapshot.sourceCount,
      marketHeat: classifyMarketHeat(snapshot.marketHeatIndex) as any,
    },
  })
}

// ─── Internal: Mapping ───────────────────────────────────────────────────────

function mapPrismaToSnapshot(row: any): MarketSnapshotData {
  return {
    marketKey: [row.countryIso2, row.city, row.community]
      .filter(Boolean)
      .map((p: string) => p.toLowerCase().replace(/\s+/g, '_'))
      .join(':'),
    city: row.city,
    community: row.community ?? undefined,
    countryIso2: row.countryIso2,
    snapshotAt: row.snapshotDate?.toISOString() ?? new Date().toISOString(),
    medianPrice: row.medianPrice ?? 0,
    avgPricePerSqft: row.avgPricePerSqft ?? 0,
    medianPricePerSqft: row.medianPricePerSqft ?? 0,
    pricePerSqftP25: row.pricePerSqftP25 ?? 0,
    pricePerSqftP75: row.pricePerSqftP75 ?? 0,
    priceChangeMomPct: row.priceChangeMomPct ?? 0,
    priceChangeQoqPct: row.priceChangeQoqPct ?? 0,
    priceChangeYoyPct: row.priceChangeYoyPct ?? 0,
    demandIndex: row.demandIndex ?? 50,
    supplyIndex: row.supplyIndex ?? 50,
    inventoryMonths: row.inventoryMonths ?? 6,
    absorptionRate: row.absorptionRate ?? 0,
    activeListings: row.activeListings ?? 0,
    newListings30d: row.newListings30d ?? 0,
    transactions30d: row.transactions30d ?? 0,
    rentalYieldAvg: row.rentalYieldAvg ?? 0,
    avgRentPerSqft: row.avgRentPerSqft ?? 0,
    rentChangeYoyPct: row.rentChangeYoyPct ?? 0,
    priceToRentRatio: row.priceToRentRatio ?? 0,
    vacancyRate: row.vacancyRate ?? 0,
    avgDaysOnMarket: row.avgDaysOnMarket ?? 0,
    listToSaleRatio: row.listToSaleRatio ?? 0,
    priceDropFrequency: row.priceDropFrequency ?? 0,
    marketHeatIndex: row.marketHeatIndex ?? 50,
    investmentGradeIndex: row.investmentGradeIndex ?? 50,
    affordabilityIndex: row.affordabilityIndex ?? 50,
    dataQualityScore: row.dataQualityScore ?? 0,
    sampleSize: row.sampleSize ?? 0,
    sourceCount: row.sourceCount ?? 1,
    version: row.version ?? 1,
  }
}

// ─── Internal: Math Utilities ────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24)
}

function computeDemandIndex(transactions30d: number, activeListings: number): number {
  if (activeListings === 0) return 50
  const ratio = transactions30d / activeListings
  return Math.min(100, Math.round(ratio * 200))
}

function computeSupplyIndex(activeListings: number, newListings30d: number): number {
  return Math.min(100, Math.round((activeListings / Math.max(1, newListings30d)) * 20))
}

function computeInvestmentGradeIndex(params: {
  rentalYieldAvg: number
  priceChangeYoyPct: number
  marketHeatIndex: number
  avgDaysOnMarket: number
}): number {
  const yieldScore = Math.min(100, params.rentalYieldAvg * 12)
  const growthScore = Math.min(100, Math.max(0, 50 + params.priceChangeYoyPct * 3))
  const heatScore = params.marketHeatIndex
  const liquidityScore = Math.max(0, 100 - params.avgDaysOnMarket * 1.5)

  return Math.round(
    yieldScore * 0.30 +
    growthScore * 0.30 +
    heatScore * 0.20 +
    liquidityScore * 0.20
  )
}
