// ━━━ VerixShield Valuation Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Statistical + heuristic valuation model
// In production, this would be replaced with XGBoost/RandomForest via Python microservice
// Current implementation uses weighted comparables + market adjustments

import { prisma } from '@/lib/prisma'
import type { PropertyInput, ValuationResult } from './types'

const MODEL_VERSION = '1.0.0'

// ── Location quality multipliers (UAE market-specific) ──
const LOCATION_MULTIPLIERS: Record<string, number> = {
  'dubai marina': 1.35,
  'palm jumeirah': 1.65,
  'downtown dubai': 1.50,
  'business bay': 1.20,
  'jvc': 0.85,
  'jumeirah village circle': 0.85,
  'dubai hills': 1.25,
  'dubai creek harbour': 1.30,
  'jlt': 0.95,
  'jumeirah lake towers': 0.95,
  'motor city': 0.80,
  'sports city': 0.78,
  'dubailand': 0.75,
  'arjan': 0.82,
  'al barsha': 0.90,
  'meydan': 1.15,
  'sobha hartland': 1.20,
  'damac hills': 0.90,
  'damac hills 2': 0.75,
  'town square': 0.78,
  'international city': 0.60,
  'discovery gardens': 0.65,
}

// ── BHK base price adjustments (AED per sqft baseline) ──
const BHK_BASE_RATES: Record<number, number> = {
  0: 1400,  // Studio
  1: 1250,
  2: 1150,
  3: 1050,
  4: 950,
  5: 900,
}

// ── Property type multipliers ──
const PROPERTY_TYPE_MULTIPLIERS: Record<string, number> = {
  'apartment': 1.0,
  'villa': 1.15,
  'townhouse': 1.10,
  'penthouse': 1.45,
  'duplex': 1.20,
  'plot': 0.65,
  'commercial': 0.90,
  'office': 0.85,
}

interface ComparableData {
  price: number
  sqft: number
  pricePerSqft: number
}

export async function runValuationEngine(input: PropertyInput): Promise<ValuationResult> {
  const confidenceReasons: string[] = []
  let confidence = 100

  // ── Step 1: Gather comparable data from market listings ──
  const comparables = await fetchComparables(input)

  if (comparables.length === 0) {
    // Fallback: use heuristic model if no comparables
    return heuristicValuation(input)
  }

  // ── Step 2: Weight comparables by similarity ──
  const prices = comparables.map(c => c.pricePerSqft)
  const sortedPrices = [...prices].sort((a, b) => a - b)

  // Remove outliers (IQR method)
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)]
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)]
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const filtered = sortedPrices.filter(p => p >= lowerBound && p <= upperBound)

  if (filtered.length < 3) {
    confidence -= 20
    confidenceReasons.push('Limited comparable data after outlier removal')
  }

  // ── Step 3: Calculate valuation range ──
  const avgPricePerSqft = filtered.reduce((s, v) => s + v, 0) / filtered.length
  const medianPricePerSqft = filtered[Math.floor(filtered.length / 2)]

  // Apply location multiplier
  const locMultiplier = getLocationMultiplier(input.community || input.city || '')
  const propMultiplier = getPropertyTypeMultiplier(input.propertyType || '')

  const adjustedMedian = medianPricePerSqft * locMultiplier * propMultiplier
  const sqft = input.sqft || estimateSqft(input.bhk || 0)

  // Standard deviation for range
  const stdDev = Math.sqrt(
    filtered.reduce((sum, p) => sum + Math.pow(p - avgPricePerSqft, 2), 0) / filtered.length
  )
  const variability = stdDev / avgPricePerSqft

  const estimatedMedian = Math.round(adjustedMedian * sqft)
  const spreadFactor = Math.max(0.08, Math.min(0.25, variability))
  const estimatedMin = Math.round(estimatedMedian * (1 - spreadFactor))
  const estimatedMax = Math.round(estimatedMedian * (1 + spreadFactor))

  // ── Step 4: Confidence scoring ──
  if (comparables.length >= 10) {
    confidenceReasons.push(`Strong dataset: ${comparables.length} comparable properties`)
  } else if (comparables.length >= 5) {
    confidence -= 10
    confidenceReasons.push(`Moderate dataset: ${comparables.length} comparables`)
  } else {
    confidence -= 25
    confidenceReasons.push(`Limited dataset: ${comparables.length} comparables`)
  }

  if (variability > 0.3) {
    confidence -= 15
    confidenceReasons.push('High price variability in area')
  }

  if (!input.sqft || input.sqft <= 0) {
    confidence -= 15
    confidenceReasons.push('Square footage estimated (not provided)')
  }

  if (!input.community) {
    confidence -= 10
    confidenceReasons.push('Community not specified — using city-level data')
  }

  confidence = Math.max(15, Math.min(100, confidence))

  return {
    estimatedMin,
    estimatedMax,
    estimatedMedian,
    confidence: Math.round(confidence),
    confidenceReasons,
    modelVersion: MODEL_VERSION,
  }
}

// ── Fetch comparables from DB ──
async function fetchComparables(input: PropertyInput): Promise<ComparableData[]> {
  try {
    const whereClause: any = {
      isActive: true,
      sqft: { gt: 0 },
      price: { gt: 0 },
    }

    if (input.city) {
      whereClause.city = { equals: input.city, mode: 'insensitive' }
    }

    if (input.community) {
      whereClause.community = { equals: input.community, mode: 'insensitive' }
    }

    if (input.bhk !== undefined && input.bhk >= 0) {
      whereClause.bhk = { gte: Math.max(0, input.bhk - 1), lte: input.bhk + 1 }
    }

    if (input.sqft && input.sqft > 0) {
      const sqftRange = input.sqft * 0.3
      whereClause.sqft = { gte: input.sqft - sqftRange, lte: input.sqft + sqftRange }
    }

    const listings = await (prisma as any).marketListing.findMany({
      where: whereClause,
      select: { price: true, sqft: true, pricePerSqft: true },
      take: 50,
      orderBy: { listedAt: 'desc' },
    })

    return listings.map((l: any) => ({
      price: l.price,
      sqft: l.sqft,
      pricePerSqft: l.pricePerSqft || (l.sqft > 0 ? l.price / l.sqft : 0),
    })).filter((l: ComparableData) => l.pricePerSqft > 0)
  } catch {
    return []
  }
}

// ── Heuristic fallback valuation ──
function heuristicValuation(input: PropertyInput): ValuationResult {
  const bhk = input.bhk || 1
  const sqft = input.sqft || estimateSqft(bhk)
  const baseRate = BHK_BASE_RATES[Math.min(bhk, 5)] || 1100
  const locMultiplier = getLocationMultiplier(input.community || input.city || '')
  const propMultiplier = getPropertyTypeMultiplier(input.propertyType || '')

  const adjustedRate = baseRate * locMultiplier * propMultiplier
  const median = Math.round(adjustedRate * sqft)
  const min = Math.round(median * 0.85)
  const max = Math.round(median * 1.15)

  return {
    estimatedMin: min,
    estimatedMax: max,
    estimatedMedian: median,
    confidence: 35,
    confidenceReasons: [
      'No comparable data available — using heuristic model',
      'Estimate based on market averages for this configuration',
      'Accuracy improves as more market data is collected',
    ],
    modelVersion: MODEL_VERSION,
  }
}

// ── Helpers ──

function getLocationMultiplier(location: string): number {
  const normalized = location.toLowerCase().trim()
  for (const [key, value] of Object.entries(LOCATION_MULTIPLIERS)) {
    if (normalized.includes(key)) return value
  }
  return 1.0
}

function getPropertyTypeMultiplier(propertyType: string): number {
  const normalized = (propertyType || 'apartment').toLowerCase().trim()
  for (const [key, value] of Object.entries(PROPERTY_TYPE_MULTIPLIERS)) {
    if (normalized.includes(key)) return value
  }
  return 1.0
}

function estimateSqft(bhk: number): number {
  const estimates: Record<number, number> = {
    0: 450,   // Studio
    1: 750,
    2: 1100,
    3: 1600,
    4: 2200,
    5: 3000,
  }
  return estimates[Math.min(bhk, 5)] || 1100
}
