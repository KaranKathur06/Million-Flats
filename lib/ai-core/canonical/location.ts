// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Canonical Location Model
// Phase 0: Intelligence Foundation
//
// Every address flows through:
//   Raw → Geocoded → Normalized → Community → City → State → Country
//
// AI engines never see raw addresses — only CanonicalLocation.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Canonical Location ──────────────────────────────────────────────────────

export interface CanonicalLocation {
  // ── Raw Input ──────────────────────────────────────────────────────────────
  raw?: string                      // Original address string from provider

  // ── Normalized Address ─────────────────────────────────────────────────────
  normalized: string                // Cleaned, standardized address string

  // ── Geocoded Coordinates ───────────────────────────────────────────────────
  latitude?: number
  longitude?: number
  geocodeConfidence?: number        // 0-100 how confident the geocode is
  geocodeSource?: string            // "GOOGLE_MAPS" | "PROVIDER" | "MANUAL"

  // ── Administrative Hierarchy ───────────────────────────────────────────────
  community: LocationEntity
  city: LocationEntity
  state?: LocationEntity
  country: CountryEntity

  // ── Points of Interest Proximity ───────────────────────────────────────────
  poiProximity: POIProximity[]

  // ── Derived Scores ─────────────────────────────────────────────────────────
  walkabilityScore?: number         // 0-100
  transitScore?: number             // 0-100
  connectivityScore?: number        // 0-100

  // ── Pincode / Postal ───────────────────────────────────────────────────────
  pincode?: string
}

// ─── Location Entity ─────────────────────────────────────────────────────────

export interface LocationEntity {
  id?: string                       // Internal DB ID if available
  name: string
  slug?: string                     // URL-friendly slug
}

export interface CountryEntity {
  iso2: string                      // "AE", "IN", "US"
  name: string
}

// ─── POI Proximity ───────────────────────────────────────────────────────────

export type POIType =
  | 'METRO_STATION'
  | 'BUS_STATION'
  | 'AIRPORT'
  | 'SCHOOL'
  | 'UNIVERSITY'
  | 'HOSPITAL'
  | 'CLINIC'
  | 'MALL'
  | 'SUPERMARKET'
  | 'RESTAURANT'
  | 'PARK'
  | 'GYM'
  | 'IT_HUB'
  | 'BUSINESS_PARK'
  | 'HIGHWAY'
  | 'ROAD'
  | 'RELIGIOUS'
  | 'GOVERNMENT'
  | 'BANK'
  | 'PHARMACY'

export interface POIProximity {
  type: POIType
  name: string
  distanceKm: number
  walkTimeMin?: number              // Estimated walking time
  driveTimeMin?: number             // Estimated driving time
  source?: string                   // Provider that reported this POI
}

// ─── Market Key ──────────────────────────────────────────────────────────────

/**
 * Generate a canonical market key from a location.
 * Format: "{countryIso2}:{city}:{community}" or "{countryIso2}:{city}"
 * 
 * This key is used to look up MarketSnapshots, comparable properties,
 * and aggregate market intelligence.
 */
export function toMarketKey(location: CanonicalLocation): string {
  const parts = [location.country.iso2, location.city.name]
  if (location.community?.name) {
    parts.push(location.community.name)
  }
  return parts
    .map(p => p.toLowerCase().trim().replace(/\s+/g, '_'))
    .join(':')
}

/**
 * Generate a city-level market key (no community).
 */
export function toCityMarketKey(location: CanonicalLocation): string {
  return [location.country.iso2, location.city.name]
    .map(p => p.toLowerCase().trim().replace(/\s+/g, '_'))
    .join(':')
}

// ─── Location Normalization ──────────────────────────────────────────────────

/**
 * Normalize a raw address string into a clean format.
 * Removes redundant whitespace, standardizes separators, trims.
 */
export function normalizeAddress(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/\s+/g, ' ')           // collapse whitespace
    .replace(/[,]{2,}/g, ',')       // collapse multiple commas
    .replace(/,\s*,/g, ',')         // remove empty comma segments
    .replace(/^\s*,\s*/g, '')       // leading comma
    .replace(/\s*,\s*$/g, '')       // trailing comma
    .trim()
}

/**
 * Normalize a community/city name for consistent comparison.
 * "Jumeirah Village Circle (JVC)" → "jumeirah village circle"
 */
export function normalizeLocationName(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '') // remove parenthesized abbreviations
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate a URL-friendly slug from a location name.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Compute Haversine distance between two coordinates in kilometers.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
