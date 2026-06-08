// ━━━ VerixShield Market Signal Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Calculates demand score, listing velocity, avg days on market
// Uses both stored signals and real-time computation from listings data

import { prisma } from '@/lib/prisma'
import type { PropertyInput, MarketSignalResult } from './types'

export async function runMarketSignalEngine(input: PropertyInput): Promise<MarketSignalResult> {
  try {
    // ── Step 1: Check for cached signals ──
    const cached = await fetchCachedSignals(input)
    if (cached) {
      // Check freshness (24h)
      const age = Date.now() - new Date(cached.calculatedAt).getTime()
      if (age < 24 * 60 * 60 * 1000) {
        return {
          demandScore: cached.demandScore,
          supplyScore: cached.supplyScore,
          listingVelocity: cached.listingVelocity,
          avgDaysOnMarket: cached.avgDaysOnMarket,
          inventoryMonths: cached.inventoryMonths,
          priceToRentRatio: cached.priceToRentRatio,
          dataPointCount: cached.dataPointCount,
        }
      }
    }

    // ── Step 2: Compute from live data ──
    return await computeSignals(input)
  } catch (error) {
    console.error('[VerixShield:MarketSignal] Error:', error)
    return generateDefaultSignals(input)
  }
}

async function fetchCachedSignals(input: PropertyInput): Promise<any | null> {
  try {
    const where: any = {}

    if (input.city) {
      where.city = { equals: input.city, mode: 'insensitive' }
    }

    if (input.community) {
      where.community = { equals: input.community, mode: 'insensitive' }
    } else {
      where.community = null
    }

    return await (prisma as any).marketSignal.findFirst({
      where,
      orderBy: { calculatedAt: 'desc' },
    })
  } catch {
    return null
  }
}

async function computeSignals(input: PropertyInput): Promise<MarketSignalResult> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ── Count active listings ──
  let activeListings = 0
  let recentListings = 0
  let totalListingAge = 0

  try {
    const locationFilter: any = {}
    if (input.city) locationFilter.city = { equals: input.city, mode: 'insensitive' }
    if (input.community) locationFilter.community = { equals: input.community, mode: 'insensitive' }

    // Active listings count
    activeListings = await (prisma as any).marketListing.count({
      where: { ...locationFilter, isActive: true },
    })

    // Recent listings (last 7 days) — velocity proxy
    recentListings = await (prisma as any).marketListing.count({
      where: { ...locationFilter, isActive: true, listedAt: { gte: sevenDaysAgo } },
    })

    // Average listing age (approximation)
    const listings = await (prisma as any).marketListing.findMany({
      where: { ...locationFilter, isActive: true },
      select: { listedAt: true },
      take: 200,
    })

    if (listings.length > 0) {
      totalListingAge = listings.reduce((sum: number, l: any) => {
        const ageMs = now.getTime() - new Date(l.listedAt).getTime()
        return sum + ageMs / (24 * 60 * 60 * 1000)
      }, 0)
    }
  } catch {
    // DB queries may fail if tables don't have data yet
  }

  // Also count internal properties
  let internalCount = 0
  try {
    const propFilter: any = { status: 'APPROVED' }
    if (input.city) propFilter.city = { equals: input.city, mode: 'insensitive' }

    internalCount = await (prisma as any).manualProperty.count({ where: propFilter })
  } catch {}

  const totalDataPoints = activeListings + internalCount
  const listingVelocity = recentListings  // per week
  const avgDaysOnMarket = totalDataPoints > 0 ? Math.round(totalListingAge / Math.max(1, activeListings)) : 45

  // ── Demand Score ──
  // Higher velocity + lower days on market = higher demand
  let demandScore = 50
  if (listingVelocity > 20) demandScore += 20
  else if (listingVelocity > 10) demandScore += 10
  else if (listingVelocity < 3) demandScore -= 15

  if (avgDaysOnMarket < 30) demandScore += 15
  else if (avgDaysOnMarket < 60) demandScore += 5
  else if (avgDaysOnMarket > 120) demandScore -= 20

  demandScore = Math.max(10, Math.min(95, demandScore))

  // ── Supply Score ──
  let supplyScore = 50
  if (activeListings > 100) supplyScore += 25
  else if (activeListings > 50) supplyScore += 10
  else if (activeListings < 10) supplyScore -= 20

  supplyScore = Math.max(10, Math.min(95, supplyScore))

  // ── Inventory Months ──
  const monthlyAbsorption = listingVelocity > 0 ? listingVelocity * 4 : 10
  const inventoryMonths = monthlyAbsorption > 0
    ? Math.round((activeListings / monthlyAbsorption) * 10) / 10
    : null

  // ── Store computed signals ──
  try {
    if (input.city) {
      await (prisma as any).marketSignal.upsert({
        where: {
          city_community: {
            city: input.city,
            community: input.community || '',
          },
        },
        update: {
          demandScore,
          supplyScore,
          listingVelocity,
          avgDaysOnMarket,
          inventoryMonths,
          dataPointCount: totalDataPoints,
          calculatedAt: now,
        },
        create: {
          city: input.city,
          community: input.community || null,
          demandScore,
          supplyScore,
          listingVelocity,
          avgDaysOnMarket,
          inventoryMonths,
          dataPointCount: totalDataPoints,
          calculatedAt: now,
        },
      })
    }
  } catch {
    // Non-critical: caching failure is acceptable
  }

  return {
    demandScore,
    supplyScore,
    listingVelocity,
    avgDaysOnMarket,
    inventoryMonths,
    priceToRentRatio: null,
    dataPointCount: totalDataPoints,
  }
}

function generateDefaultSignals(input: PropertyInput): MarketSignalResult {
  // Dubai market defaults based on typical metrics
  const community = (input.community || '').toLowerCase()

  // Premium communities have higher demand
  const premiumCommunities = ['palm jumeirah', 'downtown dubai', 'dubai marina', 'dubai hills']
  const isPremium = premiumCommunities.some(c => community.includes(c))

  return {
    demandScore: isPremium ? 78 : 62,
    supplyScore: isPremium ? 45 : 58,
    listingVelocity: isPremium ? 18 : 12,
    avgDaysOnMarket: isPremium ? 35 : 52,
    inventoryMonths: isPremium ? 3.2 : 5.1,
    priceToRentRatio: isPremium ? 22 : 18,
    dataPointCount: 0,
  }
}
