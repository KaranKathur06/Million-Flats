// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Canonical Property Model
// Phase 0: Intelligence Foundation
//
// Every provider maps into ONE canonical property structure.
// No provider-specific fields ever reach AI engines.
// All engines consume CanonicalProperty — never raw provider data.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { CanonicalLocation } from './location'

// ─── Property Classification ─────────────────────────────────────────────────

export type PropertyType =
  | 'APARTMENT'
  | 'VILLA'
  | 'TOWNHOUSE'
  | 'PENTHOUSE'
  | 'STUDIO'
  | 'DUPLEX'
  | 'LAND'
  | 'COMMERCIAL'
  | 'WAREHOUSE'
  | 'OFFICE'
  | 'RETAIL'
  | 'OTHER'

export type PropertySubType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'MIXED_USE'
  | 'INDUSTRIAL'

export type FurnishingStatus =
  | 'FURNISHED'
  | 'SEMI_FURNISHED'
  | 'UNFURNISHED'
  | 'SHELL_CORE'

export type ConstructionStatus =
  | 'READY'
  | 'OFF_PLAN'
  | 'UNDER_CONSTRUCTION'
  | 'SHELL_AND_CORE'
  | 'RENOVATION'

export type PropertyIntent =
  | 'SALE'
  | 'RENT'
  | 'LEASE'

export type Facing =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'NORTH_EAST'
  | 'NORTH_WEST'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST'

export type MarketSegment =
  | 'ULTRA_LUXURY'
  | 'LUXURY'
  | 'PREMIUM'
  | 'MID_RANGE'
  | 'AFFORDABLE'
  | 'BUDGET'

// ─── Canonical Property ──────────────────────────────────────────────────────

export interface CanonicalProperty {
  // ── Identity ───────────────────────────────────────────────────────────────
  id: string                        // Internal canonical ID
  source: string                    // Provider name: "MILLIONFLATS" | "DEMO_MARKET" | etc.
  sourceId: string                  // Original ID in source system
  sourceType: 'MANUAL_PROPERTY' | 'PROJECT' | 'NORMALIZED_LISTING'

  // ── Classification ─────────────────────────────────────────────────────────
  propertyType: PropertyType
  subType?: PropertySubType
  marketSegment?: MarketSegment
  intent: PropertyIntent

  // ── Physical Attributes ────────────────────────────────────────────────────
  configuration: PropertyConfiguration
  amenities: string[]               // Normalized amenity list
  constructionStatus: ConstructionStatus
  constructionYear?: number         // Year built or expected completion
  facing?: Facing

  // ── Financial ──────────────────────────────────────────────────────────────
  askingPrice?: number
  currency: string                  // ISO 4217: "AED", "INR", "USD"
  pricePerSqft?: number             // Computed: askingPrice / carpetAreaSqft

  // ── Location (always geocoded + normalized) ────────────────────────────────
  location: CanonicalLocation

  // ── Relationships ──────────────────────────────────────────────────────────
  developerId?: string
  developerName?: string
  projectId?: string
  projectName?: string
  agentId?: string

  // ── Media ──────────────────────────────────────────────────────────────────
  imageCount: number
  has3dTour: boolean
  hasVideo: boolean
  hasBrochure: boolean

  // ── Metadata ───────────────────────────────────────────────────────────────
  title?: string
  description?: string
  listedAt?: string                 // ISO date
  updatedAt: string                 // ISO date
  isNormalized: boolean             // Has gone through normalization pipeline
  confidence: number                // 0-100 — how much we trust this data
}

// ─── Property Configuration ──────────────────────────────────────────────────

export interface PropertyConfiguration {
  bedrooms: number
  bathrooms: number
  carpetAreaSqft?: number
  superBuiltUpSqft?: number
  builtUpRatio?: number             // carpet / super (0-1)
  floorNumber?: number
  totalFloors?: number
  floorRatio?: number               // floor / total (0-1)
  parkingSpaces?: number
  balconies?: number
}

// ─── Normalization Helpers ───────────────────────────────────────────────────

/**
 * Normalize a property type string from any source into canonical PropertyType.
 * Handles common variations: "apt" → "APARTMENT", "1BHK" → "APARTMENT", etc.
 */
export function normalizePropertyType(raw: string | null | undefined): PropertyType {
  if (!raw) return 'OTHER'
  const lower = raw.toLowerCase().trim()

  if (/\b(apartment|apt|flat|bhk)\b/.test(lower)) return 'APARTMENT'
  if (/\b(villa|bungalow|independent house)\b/.test(lower)) return 'VILLA'
  if (/\b(townhouse|town house|row house)\b/.test(lower)) return 'TOWNHOUSE'
  if (/\b(penthouse)\b/.test(lower)) return 'PENTHOUSE'
  if (/\b(studio)\b/.test(lower)) return 'STUDIO'
  if (/\b(duplex)\b/.test(lower)) return 'DUPLEX'
  if (/\b(land|plot)\b/.test(lower)) return 'LAND'
  if (/\b(office)\b/.test(lower)) return 'OFFICE'
  if (/\b(retail|shop)\b/.test(lower)) return 'RETAIL'
  if (/\b(warehouse)\b/.test(lower)) return 'WAREHOUSE'
  if (/\b(commercial)\b/.test(lower)) return 'COMMERCIAL'

  return 'OTHER'
}

/**
 * Normalize furnishing status from various formats.
 */
export function normalizeFurnishing(raw: string | null | undefined): FurnishingStatus | undefined {
  if (!raw) return undefined
  const lower = raw.toLowerCase().trim()

  if (/\b(fully furnished|furnished)\b/.test(lower) && !/semi/.test(lower)) return 'FURNISHED'
  if (/\b(semi|partial)\b/.test(lower)) return 'SEMI_FURNISHED'
  if (/\b(unfurnished|bare)\b/.test(lower)) return 'UNFURNISHED'
  if (/\b(shell|core)\b/.test(lower)) return 'SHELL_CORE'

  return undefined
}

/**
 * Classify a property into market segment based on price per sqft and location.
 * Thresholds are market-dependent — these are UAE/Dubai defaults.
 */
export function classifyMarketSegment(
  pricePerSqft: number | undefined,
  countryIso2: string
): MarketSegment | undefined {
  if (!pricePerSqft) return undefined

  // UAE thresholds (AED/sqft)
  if (countryIso2 === 'AE') {
    if (pricePerSqft >= 5000) return 'ULTRA_LUXURY'
    if (pricePerSqft >= 2500) return 'LUXURY'
    if (pricePerSqft >= 1500) return 'PREMIUM'
    if (pricePerSqft >= 800)  return 'MID_RANGE'
    if (pricePerSqft >= 400)  return 'AFFORDABLE'
    return 'BUDGET'
  }

  // India thresholds (INR/sqft)
  if (countryIso2 === 'IN') {
    if (pricePerSqft >= 25000) return 'ULTRA_LUXURY'
    if (pricePerSqft >= 15000) return 'LUXURY'
    if (pricePerSqft >= 8000)  return 'PREMIUM'
    if (pricePerSqft >= 4000)  return 'MID_RANGE'
    if (pricePerSqft >= 2000)  return 'AFFORDABLE'
    return 'BUDGET'
  }

  // Generic fallback (USD-equivalent)
  if (pricePerSqft >= 1500) return 'ULTRA_LUXURY'
  if (pricePerSqft >= 800)  return 'LUXURY'
  if (pricePerSqft >= 400)  return 'PREMIUM'
  if (pricePerSqft >= 200)  return 'MID_RANGE'
  if (pricePerSqft >= 100)  return 'AFFORDABLE'
  return 'BUDGET'
}

/**
 * Normalize amenity strings into a clean, deduplicated list.
 */
export function normalizeAmenities(raw: unknown): string[] {
  if (!raw) return []

  let items: string[] = []

  if (Array.isArray(raw)) {
    items = raw.map(String)
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) items = parsed.map(String)
      else items = [raw]
    } catch {
      items = raw.split(',').map(s => s.trim())
    }
  } else if (typeof raw === 'object') {
    items = Object.values(raw as Record<string, unknown>).map(String)
  }

  // Normalize and deduplicate
  return [...new Set(
    items
      .map(a => a.toLowerCase().trim())
      .filter(Boolean)
      .map(a => a.replace(/[_-]/g, ' ').replace(/\s+/g, ' '))
  )]
}
