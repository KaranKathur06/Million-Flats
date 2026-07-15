// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Comparable Property Engine
// Phase 5: Comparable Property Engine (Wave 1)
//
// Multi-dimensional similarity engine that finds the strongest comparable
// evidence for any property. Returns structured, scored comparables
// decomposed into 11 dimensions — never a black-box "similar" list.
//
// Consumed by: Valuation Engine, Investment Engine, Evidence Engine,
//              Recommendation Engine, and Report Generator.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import { haversineDistance } from '../canonical/location'
import type { FeatureVector } from '../feature-store'

// ─── Comparable Result ───────────────────────────────────────────────────────

export interface ComparableResult {
  /** Total comparables found */
  totalFound: number

  /** Price-based comparables (same area, similar price/sqft) */
  priceComparables: ScoredComparable[]

  /** Investment-based comparables (similar investment profile) */
  investmentComparables: ScoredComparable[]

  /** Rental-based comparables (similar rental characteristics) */
  rentalComparables: ScoredComparable[]

  /** Developer-based comparables (same/similar developer) */
  developerComparables: ScoredComparable[]

  /** Market statistics computed from comparables */
  marketStats: ComparableMarketStats

  /** Computation metadata */
  meta: {
    searchRadiusKm: number
    matchedCommunity: boolean
    matchedCity: boolean
    computedAt: string
    durationMs: number
  }
}

export interface ScoredComparable {
  /** Property identifier */
  entityId: string
  entityType: string

  /** Composite similarity score (0-1, 1 = perfect match) */
  similarityScore: number

  /** Per-dimension similarity breakdown */
  dimensions: DimensionScore[]

  /** Key property attributes for display */
  snapshot: ComparableSnapshot
}

export interface DimensionScore {
  dimension: ComparableDimension
  score: number                     // 0-1
  weight: number                    // How much this dimension contributes
  weighted: number                  // score * weight
  detail?: string                   // Human-readable explanation
}

export type ComparableDimension =
  | 'LOCATION'
  | 'AREA'
  | 'CONFIGURATION'
  | 'AMENITIES'
  | 'DEVELOPER'
  | 'AGE'
  | 'FURNISHING'
  | 'FLOOR'
  | 'PROJECT'
  | 'LOCALITY'
  | 'MARKET_SEGMENT'

export interface ComparableSnapshot {
  title?: string
  propertyType?: string
  bedrooms: number
  bathrooms: number
  areaSqft: number
  price?: number
  pricePerSqft?: number
  city?: string
  community?: string
  developerName?: string
  latitude?: number
  longitude?: number
  distanceKm?: number
}

export interface ComparableMarketStats {
  /** Statistics from all comparables */
  count: number
  avgPricePerSqft: number
  medianPricePerSqft: number
  minPricePerSqft: number
  maxPricePerSqft: number
  stdDevPricePerSqft: number
  avgPrice: number
  medianPrice: number
}

// ─── Dimension Weights ───────────────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<ComparableDimension, number> = {
  LOCATION:       0.25,     // Most important — same community = strong signal
  AREA:           0.20,     // Size similarity
  CONFIGURATION:  0.15,     // Bedroom/bathroom match
  MARKET_SEGMENT: 0.08,     // Same market tier
  DEVELOPER:      0.07,     // Same developer bonus
  PROJECT:        0.06,     // Same project = strongest signal
  AGE:            0.06,     // Construction year proximity
  LOCALITY:       0.05,     // Micromarket match
  AMENITIES:      0.04,     // Amenity overlap
  FURNISHING:     0.02,     // Furnishing match
  FLOOR:          0.02,     // Floor proximity
}

// ─── Find Comparables ────────────────────────────────────────────────────────

/**
 * Find comparable properties for a given property.
 * Uses multi-dimensional similarity scoring across 11 dimensions.
 */
export async function findComparables(
  subject: FeatureVector,
  options: {
    limit?: number
    maxRadiusKm?: number
    weights?: Partial<Record<ComparableDimension, number>>
  } = {}
): Promise<ComparableResult> {
  const start = Date.now()
  const limit = options.limit ?? 20
  const maxRadiusKm = options.maxRadiusKm ?? 10
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) }

  // ── Step 1: Candidate selection (broadening search if needed) ──────────────
  let candidates = await fetchCandidates(subject, maxRadiusKm, limit * 5)
  let matchedCommunity = true
  let matchedCity = true

  if (candidates.length < 5 && subject.city) {
    // Broaden to city level if community has too few
    candidates = await fetchCandidates(subject, maxRadiusKm * 2, limit * 5, true)
    matchedCommunity = false
  }

  if (candidates.length < 3) {
    matchedCity = false
  }

  // ── Step 2: Score each candidate across 11 dimensions ──────────────────────
  const scored: ScoredComparable[] = candidates.map(candidate => {
    const dimensions = scoreDimensions(subject, candidate, weights)
    const similarityScore = dimensions.reduce((sum, d) => sum + d.weighted, 0)

    return {
      entityId: candidate.entityId,
      entityType: candidate.entityType,
      similarityScore: Math.round(similarityScore * 1000) / 1000,
      dimensions,
      snapshot: {
        title: candidate.title ?? undefined,
        propertyType: candidate.propertyType ?? undefined,
        bedrooms: candidate.bedroomCount ?? 0,
        bathrooms: candidate.bathroomCount ?? 0,
        areaSqft: candidate.carpetAreaSqft ?? 0,
        price: undefined,
        pricePerSqft: candidate.pricePerSqftAreaAvg ?? undefined,
        city: candidate.city ?? undefined,
        community: candidate.community ?? undefined,
        developerName: candidate.developerName ?? undefined,
        latitude: candidate.latitude ?? undefined,
        longitude: candidate.longitude ?? undefined,
        distanceKm: computeDistanceKm(subject, candidate),
      },
    }
  })

  // ── Step 3: Sort by similarity and split into categories ───────────────────
  scored.sort((a, b) => b.similarityScore - a.similarityScore)

  const priceComparables = scored
    .filter(c => c.snapshot.pricePerSqft && c.snapshot.pricePerSqft > 0)
    .slice(0, limit)

  const investmentComparables = scored
    .slice(0, limit)

  const rentalComparables = scored
    .filter(c => c.snapshot.areaSqft > 0)
    .slice(0, limit)

  const developerComparables = scored
    .filter(c => c.snapshot.developerName && c.snapshot.developerName === subject.developerName)
    .slice(0, Math.min(limit, 10))

  // ── Step 4: Compute market statistics from comparables ─────────────────────
  const prices = priceComparables
    .map(c => c.snapshot.pricePerSqft)
    .filter((p): p is number => p !== undefined && p > 0)

  const marketStats = computeMarketStats(
    prices,
    priceComparables.map(c => c.snapshot.price).filter((p): p is number => p !== undefined)
  )

  return {
    totalFound: scored.length,
    priceComparables,
    investmentComparables,
    rentalComparables,
    developerComparables,
    marketStats,
    meta: {
      searchRadiusKm: maxRadiusKm,
      matchedCommunity,
      matchedCity,
      computedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    },
  }
}

// ─── Dimension Scoring ───────────────────────────────────────────────────────

function scoreDimensions(
  subject: FeatureVector,
  candidate: CandidateRow,
  weights: Record<ComparableDimension, number>
): DimensionScore[] {
  const dims: DimensionScore[] = []

  // 1. Location (distance-based decay)
  const distKm = computeDistanceKm(subject, candidate)
  const locationScore = distKm !== undefined
    ? Math.max(0, 1 - distKm / 10) // Linear decay over 10km
    : (subject.community === candidate.community ? 0.8 : 0.3)
  dims.push({
    dimension: 'LOCATION',
    score: locationScore,
    weight: weights.LOCATION,
    weighted: locationScore * weights.LOCATION,
    detail: distKm !== undefined ? `${distKm.toFixed(1)}km away` : (subject.community === candidate.community ? 'Same community' : 'Different community'),
  })

  // 2. Area (±20% tolerance with score decay)
  const subjectArea = subject.carpetAreaSqft ?? 0
  const candidateArea = candidate.carpetAreaSqft ?? 0
  const areaScore = subjectArea > 0 && candidateArea > 0
    ? Math.max(0, 1 - Math.abs(subjectArea - candidateArea) / (subjectArea * 0.3))
    : 0.5
  dims.push({
    dimension: 'AREA',
    score: areaScore,
    weight: weights.AREA,
    weighted: areaScore * weights.AREA,
    detail: `${candidateArea} sqft (subject: ${subjectArea} sqft)`,
  })

  // 3. Configuration (bedrooms + bathrooms)
  // TODO: Update when PropertyFeatureVector includes full source data
  const bedroomMatch = (subject.bedroomCount ?? 0) === (candidate.bedroomCount ?? 0) ? 1 : Math.max(0, 1 - Math.abs((subject.bedroomCount ?? 0) - (candidate.bedroomCount ?? 0)) * 0.3)
  const bathroomMatch = (subject.bathroomCount ?? 0) === (candidate.bathroomCount ?? 0) ? 1 : Math.max(0, 1 - Math.abs((subject.bathroomCount ?? 0) - (candidate.bathroomCount ?? 0)) * 0.25)
  const configScore = bedroomMatch * 0.7 + bathroomMatch * 0.3
  dims.push({
    dimension: 'CONFIGURATION',
    score: configScore,
    weight: weights.CONFIGURATION,
    weighted: configScore * weights.CONFIGURATION,
    detail: `${candidate.bedroomCount}BR/${candidate.bathroomCount}BA`,
  })

  // 4. Amenities (Jaccard similarity)
  // TODO: Implement once PropertyFeatureVector stores amenities
  const amenityScore = 0.5 // Placeholder until amenities are available
  dims.push({
    dimension: 'AMENITIES',
    score: amenityScore,
    weight: weights.AMENITIES,
    weighted: amenityScore * weights.AMENITIES,
  })

  // 5. Developer match
  const devScore = subject.developerName && candidate.developerName
    ? (subject.developerName === candidate.developerName ? 1 : 0.3)
    : 0.5
  dims.push({
    dimension: 'DEVELOPER',
    score: devScore,
    weight: weights.DEVELOPER,
    weighted: devScore * weights.DEVELOPER,
    detail: candidate.developerName ?? 'Unknown',
  })

  // 6. Age proximity
  // TODO: Update once PropertyFeatureVector includes construction year
  const ageScore = 0.5 // Placeholder
  dims.push({
    dimension: 'AGE',
    score: ageScore,
    weight: weights.AGE,
    weighted: ageScore * weights.AGE,
  })

  // 7. Furnishing match
  const furnScore = (subject.furnishingStatus ?? '') && (candidate.furnishingStatus ?? '')
    ? (subject.furnishingStatus === candidate.furnishingStatus ? 1 : 0.4)
    : 0.5
  dims.push({
    dimension: 'FURNISHING',
    score: furnScore,
    weight: weights.FURNISHING,
    weighted: furnScore * weights.FURNISHING,
  })

  // 8. Floor proximity
  const subjectFloor = subject.floorNumber ?? 0
  const candidateFloor = candidate.floorNumber ?? 0
  const floorScore = subjectFloor > 0 && candidateFloor > 0
    ? Math.max(0, 1 - Math.abs(subjectFloor - candidateFloor) / 20)
    : 0.5
  dims.push({
    dimension: 'FLOOR',
    score: floorScore,
    weight: weights.FLOOR,
    weighted: floorScore * weights.FLOOR,
  })

  // 9. Same project bonus
  const projectScore = subject.projectId && candidate.projectId
    ? (subject.projectId === candidate.projectId ? 1 : 0)
    : 0
  dims.push({
    dimension: 'PROJECT',
    score: projectScore,
    weight: weights.PROJECT,
    weighted: projectScore * weights.PROJECT,
  })

  // 10. Locality (micromarket match)
  const localityScore = subject.community === candidate.community ? 1 : 0.3
  dims.push({
    dimension: 'LOCALITY',
    score: localityScore,
    weight: weights.LOCALITY,
    weighted: localityScore * weights.LOCALITY,
  })

  // 11. Market segment
  const segmentScore = subject.marketSegment && candidate.marketSegment
    ? (subject.marketSegment === candidate.marketSegment ? 1 : 0.4)
    : 0.5
  dims.push({
    dimension: 'MARKET_SEGMENT',
    score: segmentScore,
    weight: weights.MARKET_SEGMENT,
    weighted: segmentScore * weights.MARKET_SEGMENT,
  })

  return dims
}

// ─── Database Query ──────────────────────────────────────────────────────────

interface CandidateRow {
  entityId: string
  entityType: string
  title?: string | null
  propertyType?: string | null
  bedroomCount?: number | null
  bathroomCount?: number | null
  carpetAreaSqft?: number | null
  pricePerSqftAreaAvg?: number | null
  city?: string | null
  community?: string | null
  developerName?: string | null
  latitude?: number | null
  longitude?: number | null
  furnishingStatus?: string | null
  floorNumber?: number | null
  totalFloors?: number | null
  projectId?: string | null
  marketSegment?: string | null
  demandIndex?: number | null
  supplyIndex?: number | null
}

async function fetchCandidates(
  subject: FeatureVector,
  radiusKm: number,
  limit: number,
  cityLevelOnly = false
): Promise<CandidateRow[]> {
  const where: Record<string, unknown> = {
    entityId: { not: subject.entityId }, // Exclude self
  }

  if (cityLevelOnly) {
    if (subject.city) where.city = { equals: subject.city, mode: 'insensitive' }
  } else {
    if (subject.community) where.community = { equals: subject.community, mode: 'insensitive' }
    else if (subject.city) where.city = { equals: subject.city, mode: 'insensitive' }
  }

  if (subject.countryIso2) where.countryIso2 = subject.countryIso2

  // Property type filter (same type preferred)
  if (subject.propertyType) where.propertyType = subject.propertyType

  const candidates = await prisma.propertyFeatureVector.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      entityId: true,
      entityType: true,
      // Metadata
      title: true,
      propertyType: true,
      // Location
      latitude: true,
      longitude: true,
      city: true,
      community: true,
      // Property
      bedroomCount: true,
      bathroomCount: true,
      carpetAreaSqft: true,
      pricePerSqftAreaAvg: true,
      furnishingStatus: true,
      floorNumber: true,
      totalFloors: true,
      projectId: true,
      marketSegment: true,
      // Market
      demandIndex: true,
      supplyIndex: true,
    },
  })

  return candidates as CandidateRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDistanceKm(
  subject: { latitude?: number | null; longitude?: number | null },
  candidate: { latitude?: number | null; longitude?: number | null }
): number | undefined {
  if (!subject.latitude || !subject.longitude || !candidate.latitude || !candidate.longitude) {
    return undefined
  }
  return Math.round(haversineDistance(
    subject.latitude, subject.longitude,
    candidate.latitude, candidate.longitude
  ) * 10) / 10
}

function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0.5
  if (setA.size === 0 || setB.size === 0) return 0

  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

function parseAmenities(raw: unknown): Set<string> {
  if (!raw) return new Set()
  if (Array.isArray(raw)) return new Set(raw.map(String).map(s => s.toLowerCase()))
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return new Set(parsed.map(String).map(s => s.toLowerCase()))
    } catch { /* ignore */ }
    return new Set(raw.split(',').map(s => s.trim().toLowerCase()))
  }
  return new Set()
}

function computeMarketStats(
  pricesPerSqft: number[],
  prices: number[]
): ComparableMarketStats {
  if (pricesPerSqft.length === 0) {
    return {
      count: 0,
      avgPricePerSqft: 0,
      medianPricePerSqft: 0,
      minPricePerSqft: 0,
      maxPricePerSqft: 0,
      stdDevPricePerSqft: 0,
      avgPrice: 0,
      medianPrice: 0,
    }
  }

  const sorted = [...pricesPerSqft].sort((a, b) => a - b)
  const avg = pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length
  const mid = Math.floor(sorted.length / 2)
  const med = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]

  const variance = pricesPerSqft.reduce((sum, p) => sum + (p - avg) ** 2, 0) / pricesPerSqft.length

  const sortedPrices = [...prices].sort((a, b) => a - b)
  const priceMid = Math.floor(sortedPrices.length / 2)
  const medianPrice = sortedPrices.length > 0
    ? (sortedPrices.length % 2 === 0
      ? (sortedPrices[priceMid - 1] + sortedPrices[priceMid]) / 2
      : sortedPrices[priceMid])
    : 0

  return {
    count: pricesPerSqft.length,
    avgPricePerSqft: Math.round(avg),
    medianPricePerSqft: Math.round(med),
    minPricePerSqft: Math.round(sorted[0]),
    maxPricePerSqft: Math.round(sorted[sorted.length - 1]),
    stdDevPricePerSqft: Math.round(Math.sqrt(variance)),
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / Math.max(1, prices.length)),
    medianPrice: Math.round(medianPrice),
  }
}
