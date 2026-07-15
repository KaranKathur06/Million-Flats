// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — MillionFlats Listings Provider
// Phase 2: Provider Framework — First-Party Provider
//
// This provider consumes MillionFlats' own ManualProperty and Project data
// from the Prisma database. It is the highest-trust data source.
//
// isTemporary: false (this IS the production data)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type {
  IDataProvider,
  CollectionParams,
  ProviderCollectionResult,
  ValidationResult,
  ProviderHealthStatus,
  FreshnessMetadata,
} from './framework/types'
import type { CanonicalProperty } from '../canonical/property'
import {
  normalizePropertyType,
  normalizeAmenities,
  classifyMarketSegment,
} from '../canonical/property'
import { normalizeAddress, normalizeLocationName, toSlug } from '../canonical/location'

// ─── Raw Type (Prisma ManualProperty shape) ──────────────────────────────────

interface RawManualProperty {
  id: string
  title: string | null
  propertyType: string | null
  intent: string | null
  price: number | null
  currency: string
  constructionStatus: string | null
  shortDescription: string | null
  bedrooms: number
  bathrooms: number
  squareFeet: number
  countryCode: string
  countryIso2: string | null
  city: string | null
  community: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  developerName: string | null
  developerId: string | null
  agentId: string
  amenities: unknown
  status: string
  tour3dUrl: string | null
  media: Array<{ url: string; category: string | null }>
  createdAt: Date
  updatedAt: Date
}

// ─── Health Tracking ─────────────────────────────────────────────────────────

let lastFetchAt: string | undefined
let lastError: string | undefined
let totalRequests = 0
let totalErrors = 0

// ─── Provider Implementation ─────────────────────────────────────────────────

export const millionflatsListingsProvider: IDataProvider<RawManualProperty, CanonicalProperty> = {
  name: 'MILLIONFLATS_LISTINGS',
  displayName: 'MillionFlats Platform Listings',
  category: 'PLATFORM_LISTINGS',
  isTemporary: false,

  async collect(params: CollectionParams): Promise<ProviderCollectionResult<RawManualProperty>> {
    const start = Date.now()
    totalRequests++

    try {
      const where: Record<string, unknown> = {
        status: 'APPROVED',
      }

      if (params.countryIso2) where.countryIso2 = params.countryIso2
      if (params.city) where.city = params.city
      if (params.community) where.community = params.community
      if (params.since) where.updatedAt = { gte: params.since }

      const [properties, total] = await Promise.all([
        prisma.manualProperty.findMany({
          where,
          include: {
            media: { select: { url: true, category: true } },
          },
          take: params.limit ?? 100,
          skip: params.offset ?? 0,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.manualProperty.count({ where }),
      ])

      lastFetchAt = new Date().toISOString()

      return {
        success: true,
        data: properties as unknown as RawManualProperty[],
        source: 'MILLIONFLATS_LISTINGS',
        fetchedAt: lastFetchAt,
        latencyMs: Date.now() - start,
        totalAvailable: total,
      }
    } catch (err: any) {
      totalErrors++
      lastError = err?.message ?? 'Database query failed'

      return {
        success: false,
        data: [],
        error: lastError,
        source: 'MILLIONFLATS_LISTINGS',
        fetchedAt: new Date().toISOString(),
        latencyMs: Date.now() - start,
      }
    }
  },

  validate(raw: RawManualProperty): ValidationResult {
    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []

    if (!raw.id) errors.push({ field: 'id', message: 'Missing property ID', code: 'REQUIRED' })
    if (!raw.city) errors.push({ field: 'city', message: 'Missing city', code: 'REQUIRED' })

    if (!raw.price || raw.price <= 0) {
      warnings.push({ field: 'price', message: 'Missing or zero price', suggestion: 'Valuation engine will estimate' })
    }
    if (!raw.squareFeet || raw.squareFeet <= 0) {
      warnings.push({ field: 'squareFeet', message: 'Missing area', suggestion: 'Will use average for property type' })
    }
    if (!raw.latitude || !raw.longitude) {
      warnings.push({ field: 'coordinates', message: 'Missing geocoordinates', suggestion: 'Location features will be limited' })
    }

    return { isValid: errors.length === 0, errors, warnings }
  },

  normalize(raw: RawManualProperty): CanonicalProperty {
    const propertyType = normalizePropertyType(raw.propertyType)
    const amenities = normalizeAmenities(raw.amenities)
    const pricePerSqft = (raw.price && raw.squareFeet > 0)
      ? raw.price / raw.squareFeet
      : undefined
    const countryIso2 = raw.countryIso2 ?? (raw.countryCode === 'UAE' ? 'AE' : raw.countryCode === 'INDIA' ? 'IN' : 'AE')

    return {
      id: raw.id,
      source: 'MILLIONFLATS',
      sourceId: raw.id,
      sourceType: 'MANUAL_PROPERTY',

      propertyType,
      intent: raw.intent === 'RENT' ? 'RENT' : 'SALE',

      configuration: {
        bedrooms: raw.bedrooms,
        bathrooms: raw.bathrooms,
        carpetAreaSqft: raw.squareFeet > 0 ? raw.squareFeet : undefined,
      },
      amenities,
      constructionStatus: raw.constructionStatus === 'OFF_PLAN' ? 'OFF_PLAN' : 'READY',

      askingPrice: raw.price ?? undefined,
      currency: raw.currency,
      pricePerSqft,
      marketSegment: classifyMarketSegment(pricePerSqft, countryIso2),

      location: {
        raw: raw.address ?? undefined,
        normalized: normalizeAddress(raw.address),
        latitude: raw.latitude ?? undefined,
        longitude: raw.longitude ?? undefined,
        community: {
          name: raw.community ?? 'Unknown',
          slug: toSlug(raw.community ?? 'unknown'),
        },
        city: {
          name: raw.city ?? 'Unknown',
          slug: toSlug(raw.city ?? 'unknown'),
        },
        country: {
          iso2: countryIso2,
          name: countryIso2 === 'AE' ? 'United Arab Emirates' : countryIso2 === 'IN' ? 'India' : countryIso2,
        },
        poiProximity: [],
      },

      developerId: raw.developerId ?? undefined,
      developerName: raw.developerName ?? undefined,
      agentId: raw.agentId,

      imageCount: raw.media?.length ?? 0,
      has3dTour: !!raw.tour3dUrl,
      hasVideo: raw.media?.some(m => m.category === 'VIDEO') ?? false,
      hasBrochure: raw.media?.some(m => m.category === 'BROCHURE') ?? false,

      title: raw.title ?? undefined,
      description: raw.shortDescription ?? undefined,
      listedAt: raw.createdAt?.toISOString(),
      updatedAt: raw.updatedAt?.toISOString() ?? new Date().toISOString(),
      isNormalized: true,
      confidence: 95, // First-party data = high confidence
    }
  },

  deduplicate(items: CanonicalProperty[]): CanonicalProperty[] {
    // First-party data should already be unique by ID
    const seen = new Set<string>()
    return items.filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  },

  getHealth(): ProviderHealthStatus {
    const now = new Date().toISOString()
    const successRate = totalRequests > 0
      ? ((totalRequests - totalErrors) / totalRequests) * 100
      : 100

    return {
      status: totalErrors > 3 ? 'DEGRADED' : 'HEALTHY',
      lastCheckAt: now,
      lastSuccessAt: lastFetchAt,
      lastErrorAt: lastError ? now : undefined,
      lastError,
      successRate: Math.round(successRate),
      avgLatencyMs: 50, // DB queries are fast
      totalRequests24h: totalRequests,
      totalErrors24h: totalErrors,
    }
  },

  getFreshness(): FreshnessMetadata {
    return {
      lastFetchAt,
      ttlSeconds: 300, // 5 min TTL for first-party data
      isStale: lastFetchAt
        ? (Date.now() - new Date(lastFetchAt).getTime()) > 300_000
        : true,
    }
  },

  getConfidence(): number {
    return 95 // First-party = highest confidence
  },
}
