// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Data Provider: Google Maps POI
// Volume 3: Data Pipeline — Provider Pattern
//
// Fetches Points of Interest (metro stations, hospitals, schools, malls,
// IT hubs) from Google Places API and writes them as knowledge graph edges.
//
// Architecture:
//   Google Places API → POI Normalizer → PropertyKnowledgeEdge (DB)
//   → PropertyFeatureVector (GIS distances)
//
// Usage:
//   POST /api/internal/ai/ingest { provider: "google_maps_poi", city: "Dubai" }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { ProviderResult, NormalizedPOI } from '@/lib/ai-core/types'

// ─── POI Category → KnowledgeEdgeType mapping ────────────────────────────────

const PLACE_TYPE_MAP: Record<string, { edgeType: string; infrastructureType?: string }> = {
  subway_station:   { edgeType: 'PROPERTY_NEAR_METRO', infrastructureType: 'METRO_LINE' },
  train_station:    { edgeType: 'PROPERTY_NEAR_METRO', infrastructureType: 'METRO_LINE' },
  hospital:         { edgeType: 'PROPERTY_NEAR_HOSPITAL', infrastructureType: 'HOSPITAL' },
  school:           { edgeType: 'PROPERTY_NEAR_SCHOOL', infrastructureType: 'SCHOOL' },
  university:       { edgeType: 'PROPERTY_NEAR_SCHOOL', infrastructureType: 'UNIVERSITY' },
  shopping_mall:    { edgeType: 'PROPERTY_NEAR_MALL', infrastructureType: 'MALL' },
  airport:          { edgeType: 'PROPERTY_NEAR_AIRPORT', infrastructureType: 'AIRPORT' },
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface GoogleMapsPoiInput {
  city: string
  countryIso2: string
  radiusKm?: number
  centerLat?: number
  centerLng?: number
}

// ─── Main Provider Function ───────────────────────────────────────────────────

export async function fetchGoogleMapsPOIs(
  input: GoogleMapsPoiInput
): Promise<ProviderResult<NormalizedPOI[]>> {
  const fetchStart = Date.now()
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return {
      success: false,
      data: null,
      error: 'GOOGLE_MAPS_API_KEY not configured',
      source: 'google_maps_poi',
      fetchedAt: new Date().toISOString(),
      latencyMs: 0,
    }
  }

  const allPOIs: NormalizedPOI[] = []
  const placeTypes = Object.keys(PLACE_TYPE_MAP)

  try {
    // Fetch each POI type separately (Google API limitation)
    for (const placeType of placeTypes) {
      const pois = await fetchByType(placeType, input, apiKey)
      allPOIs.push(...pois)
    }

    return {
      success: true,
      data: allPOIs,
      source: 'google_maps_poi',
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - fetchStart,
      recordCount: allPOIs.length,
    }
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err.message ?? 'Unknown error',
      source: 'google_maps_poi',
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - fetchStart,
    }
  }
}

// ─── Single Type Fetcher ──────────────────────────────────────────────────────

async function fetchByType(
  placeType: string,
  input: GoogleMapsPoiInput,
  apiKey: string
): Promise<NormalizedPOI[]> {
  const { city, countryIso2, radiusKm = 50, centerLat, centerLng } = input

  // Use geocoded city center if no explicit coords provided
  const location = centerLat && centerLng
    ? `${centerLat},${centerLng}`
    : await geocodeCity(city, countryIso2, apiKey)

  if (!location) return []

  const radius = radiusKm * 1000  // convert to meters
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', location)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('type', placeType)
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
  if (!response.ok) return []

  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []

  return (data.results ?? []).map((place: any): NormalizedPOI => ({
    name: place.name,
    type: placeType.toUpperCase(),
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    city,
    countryIso2,
    metadata: {
      placeId: place.place_id,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      vicinity: place.vicinity,
      types: place.types,
    },
  }))
}

// ─── Geocode City ─────────────────────────────────────────────────────────────

async function geocodeCity(city: string, countryIso2: string, apiKey: string): Promise<string | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', `${city}, ${countryIso2}`)
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
  if (!response.ok) return null

  const data = await response.json()
  if (data.status !== 'OK' || !data.results?.[0]) return null

  const { lat, lng } = data.results[0].geometry.location
  return `${lat},${lng}`
}

// ─── Normalizer: Write POIs → Knowledge Graph ─────────────────────────────────

export async function writePOIsToKnowledgeGraph(
  pois: NormalizedPOI[],
  _city: string,
  countryIso2: string
): Promise<{ edgesCreated: number; propertiesLinked: number }> {
  let edgesCreated = 0
  let propertiesLinked = 0

  // Load all properties in the same country with coordinates
  const properties = await prisma.manualProperty.findMany({
    where: {
      countryIso2,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, latitude: true, longitude: true },
    take: 5000,
  })

  const projects = await prisma.project.findMany({
    where: {
      countryIso2,
      latitude: { not: null },
      longitude: { not: null },
    } as any,
    select: { id: true, latitude: true, longitude: true } as any,
    take: 5000,
  }).catch(() => [])

  // For each POI, find properties within impact radius and create edges
  for (const poi of pois) {
    const mapping = PLACE_TYPE_MAP[poi.type.toLowerCase()]
    if (!mapping) continue

    const IMPACT_RADIUS_KM = getImpactRadius(poi.type)

    for (const prop of properties) {
      if (!prop.latitude || !prop.longitude) continue

      const distKm = haversineKm(
        prop.latitude, prop.longitude,
        poi.latitude, poi.longitude
      )

      if (distKm <= IMPACT_RADIUS_KM) {
        await prisma.propertyKnowledgeEdge.upsert({
          where: {
            id: `mp_${prop.id}_${poi.name.slice(0, 20).replace(/\s/g, '_')}`,
          },
          create: {
            id: `mp_${prop.id}_${poi.name.slice(0, 20).replace(/\s/g, '_')}`,
            edgeType: mapping.edgeType as any,
            sourceType: 'MANUAL_PROPERTY',
            sourceId: prop.id,
            targetType: poi.type,
            targetName: poi.name,
            distanceKm: Math.round(distKm * 100) / 100,
            impactScore: computeImpactScore(poi.type, distKm),
            sourceProvider: 'google_maps_poi',
            confidence: 95,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          update: {
            distanceKm: Math.round(distKm * 100) / 100,
            impactScore: computeImpactScore(poi.type, distKm),
            computedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }).catch(() => {})

        edgesCreated++
        propertiesLinked++
      }
    }
  }

  return { edgesCreated, propertiesLinked }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371  // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function getImpactRadius(poiType: string): number {
  const radiusMap: Record<string, number> = {
    SUBWAY_STATION: 5,
    TRAIN_STATION: 5,
    HOSPITAL: 10,
    SCHOOL: 5,
    UNIVERSITY: 8,
    SHOPPING_MALL: 8,
    AIRPORT: 30,
  }
  return radiusMap[poiType] ?? 10
}

function computeImpactScore(poiType: string, distKm: number): number {
  // Higher impact = closer to high-value POI
  const baseImpact = {
    SUBWAY_STATION: 90,
    TRAIN_STATION: 85,
    AIRPORT: 70,
    HOSPITAL: 60,
    SCHOOL: 55,
    UNIVERSITY: 60,
    SHOPPING_MALL: 50,
  }[poiType] ?? 40

  const distFactor = Math.max(0, 1 - distKm / getImpactRadius(poiType))
  return Math.round(baseImpact * distFactor)
}
