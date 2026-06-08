// ━━━ VerixShield Comparables Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Finds similar properties using location radius, sqft range, and BHK matching
// Computes similarity scores and distance for each comparable

import { prisma } from '@/lib/prisma'
import type { PropertyInput, ComparableProperty, ComparablesResult } from './types'

const MAX_COMPARABLES = 12
const DEFAULT_RADIUS_KM = 3
const SQFT_TOLERANCE = 0.35  // ±35%
const BHK_TOLERANCE = 1

// ── Haversine distance (km) ──
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Similarity scoring ──
function computeSimilarity(
  input: PropertyInput,
  comp: any,
  distance: number
): number {
  let score = 100

  // Distance penalty (closer = better)
  if (distance > 0) {
    score -= Math.min(30, (distance / DEFAULT_RADIUS_KM) * 30)
  }

  // BHK match
  const bhkDiff = Math.abs((input.bhk || 0) - (comp.bhk || 0))
  score -= bhkDiff * 15

  // Sqft match
  if (input.sqft && input.sqft > 0 && comp.sqft && comp.sqft > 0) {
    const sqftRatio = Math.abs(input.sqft - comp.sqft) / input.sqft
    score -= Math.min(25, sqftRatio * 50)
  }

  // Property type match
  const inputType = (input.propertyType || '').toLowerCase()
  const compType = (comp.propertyType || comp.property_type || '').toLowerCase()
  if (inputType && compType && inputType !== compType) {
    score -= 10
  }

  // Same community bonus
  const inputCommunity = (input.community || '').toLowerCase().trim()
  const compCommunity = (comp.community || '').toLowerCase().trim()
  if (inputCommunity && compCommunity && inputCommunity === compCommunity) {
    score += 10
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function runComparablesEngine(input: PropertyInput): Promise<ComparablesResult> {
  const results: ComparableProperty[] = []

  try {
    // ── Strategy 1: Same community, same BHK ──
    const communityComps = await fetchByLocation(input, true)

    // ── Strategy 2: Same city, same BHK, broader radius ──
    const cityComps = communityComps.length < 5
      ? await fetchByLocation(input, false)
      : []

    // Combine and deduplicate
    const allComps = [...communityComps, ...cityComps]
    const seen = new Set<string>()

    for (const comp of allComps) {
      if (seen.has(comp.id)) continue
      seen.add(comp.id)

      // Exclude the property itself
      if (comp.id === input.id) continue

      // Calculate distance if coordinates available
      let distance = 0
      if (input.latitude && input.longitude && comp.latitude && comp.longitude) {
        distance = haversineKm(input.latitude, input.longitude, comp.latitude, comp.longitude)
        if (distance > DEFAULT_RADIUS_KM * 2) continue  // Skip if too far
      }

      const pricePerSqft = comp.pricePerSqft || (comp.sqft > 0 ? comp.price / comp.sqft : 0)
      const similarity = computeSimilarity(input, comp, distance)

      if (similarity < 30) continue  // Too dissimilar

      results.push({
        id: comp.id,
        title: comp.title || `${comp.bhk || '?'} BHK ${comp.propertyType || 'Property'}`,
        price: comp.price,
        pricePerSqft: Math.round(pricePerSqft),
        sqft: comp.sqft,
        bhk: comp.bhk,
        city: comp.city,
        community: comp.community || undefined,
        distance: Math.round(distance * 100) / 100,
        source: comp.source || 'INTERNAL',
        similarity,
      })
    }

    // Sort by similarity (highest first), take top N
    results.sort((a, b) => b.similarity - a.similarity)
    const topResults = results.slice(0, MAX_COMPARABLES)

    // Also include internal manual properties as comparables
    const internalComps = await fetchInternalComparables(input)
    for (const comp of internalComps) {
      if (seen.has(comp.id) || comp.id === input.id) continue
      seen.add(comp.id)

      let distance = 0
      if (input.latitude && input.longitude && comp.latitude && comp.longitude) {
        distance = haversineKm(input.latitude, input.longitude, comp.latitude, comp.longitude)
      }

      const pricePerSqft = comp.squareFeet > 0 ? comp.price / comp.squareFeet : 0
      const similarity = computeSimilarity(input, {
        ...comp,
        sqft: comp.squareFeet,
        bhk: comp.bedrooms,
        propertyType: comp.propertyType,
      }, distance)

      if (similarity >= 30 && pricePerSqft > 0) {
        topResults.push({
          id: comp.id,
          title: comp.title || `${comp.bedrooms} BHK`,
          price: comp.price,
          pricePerSqft: Math.round(pricePerSqft),
          sqft: comp.squareFeet,
          bhk: comp.bedrooms,
          city: comp.city || '',
          community: comp.community || undefined,
          distance: Math.round(distance * 100) / 100,
          source: 'INTERNAL',
          similarity,
        })
      }
    }

    topResults.sort((a, b) => b.similarity - a.similarity)
    const finalResults = topResults.slice(0, MAX_COMPARABLES)

    // Compute stats
    const pricesPerSqft = finalResults.map(c => c.pricePerSqft).filter(p => p > 0)
    const avgPricePerSqft = pricesPerSqft.length > 0
      ? Math.round(pricesPerSqft.reduce((s, v) => s + v, 0) / pricesPerSqft.length)
      : 0
    const sortedPrices = [...finalResults.map(c => c.price)].sort((a, b) => a - b)
    const medianPrice = sortedPrices.length > 0
      ? sortedPrices[Math.floor(sortedPrices.length / 2)]
      : 0

    return {
      comparables: finalResults,
      avgPricePerSqft,
      medianPrice,
      count: finalResults.length,
    }
  } catch (error) {
    console.error('[VerixShield:Comparables] Error:', error)
    return { comparables: [], avgPricePerSqft: 0, medianPrice: 0, count: 0 }
  }
}

// ── Fetch from MarketListing table ──
async function fetchByLocation(input: PropertyInput, communityLevel: boolean): Promise<any[]> {
  try {
    const where: any = {
      isActive: true,
      price: { gt: 0 },
      sqft: { gt: 0 },
    }

    if (input.city) {
      where.city = { equals: input.city, mode: 'insensitive' }
    }

    if (communityLevel && input.community) {
      where.community = { equals: input.community, mode: 'insensitive' }
    }

    if (input.bhk !== undefined && input.bhk >= 0) {
      where.bhk = {
        gte: Math.max(0, input.bhk - BHK_TOLERANCE),
        lte: input.bhk + BHK_TOLERANCE,
      }
    }

    if (input.sqft && input.sqft > 0) {
      const tolerance = input.sqft * SQFT_TOLERANCE
      where.sqft = { gte: input.sqft - tolerance, lte: input.sqft + tolerance }
    }

    return await (prisma as any).marketListing.findMany({
      where,
      take: 30,
      orderBy: { listedAt: 'desc' },
    })
  } catch {
    return []
  }
}

// ── Fetch from internal ManualProperty table ──
async function fetchInternalComparables(input: PropertyInput): Promise<any[]> {
  try {
    const where: any = {
      status: 'APPROVED',
      price: { gt: 0 },
      squareFeet: { gt: 0 },
    }

    if (input.city) {
      where.city = { equals: input.city, mode: 'insensitive' }
    }

    if (input.bhk !== undefined && input.bhk >= 0) {
      where.bedrooms = {
        gte: Math.max(0, input.bhk - BHK_TOLERANCE),
        lte: input.bhk + BHK_TOLERANCE,
      }
    }

    return await (prisma as any).manualProperty.findMany({
      where,
      select: {
        id: true,
        title: true,
        price: true,
        squareFeet: true,
        bedrooms: true,
        propertyType: true,
        city: true,
        community: true,
        latitude: true,
        longitude: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}
