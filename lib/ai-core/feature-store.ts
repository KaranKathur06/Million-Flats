// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Feature Store
// Volume 3: AI/ML Pipeline
//
// The Feature Store is the bridge between raw property data (Prisma) and
// the AI engines. It builds, caches, and serves the 300+ feature vectors
// that every model consumes.
//
// Architecture:
//   Property/Project (DB) → Feature Builder → PropertyFeatureVector (DB) → AI Engines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { EntityType } from './types'

// ── TTL Configuration ─────────────────────────────────────────────────────────
const FEATURE_TTL_MS = {
  LOCATION: 7 * 24 * 60 * 60 * 1000,    // 7 days (GIS rarely changes)
  MARKET: 7 * 24 * 60 * 60 * 1000,       // 7 days (weekly market updates)
  BEHAVIORAL: 24 * 60 * 60 * 1000,        // 1 day (daily platform signals)
  LEGAL: 30 * 24 * 60 * 60 * 1000,       // 30 days (legal rarely changes)
  MEDIA: 3 * 24 * 60 * 60 * 1000,        // 3 days (media infrequently changes)
  DEVELOPER: 7 * 24 * 60 * 60 * 1000,    // 7 days
}

export interface FeatureVector {
  entityId: string
  entityType: EntityType
  
  // Location
  latitude?: number
  longitude?: number
  distanceMetroKm?: number
  distanceAirportKm?: number
  distanceHospitalKm?: number
  distanceSchoolKm?: number
  distanceMallKm?: number
  distanceItHubKm?: number
  distanceHighwayKm?: number
  walkScore?: number
  connectivityScore?: number
  nearbyMetroCount?: number
  nearbySchoolCount?: number
  nearbyHospitalCount?: number
  poiDensityScore?: number
  
  // Developer
  developerPastProjects?: number
  developerDelayPct?: number
  developerQualityRating?: number
  developerLitigationCount?: number
  developerCompletionRate?: number
  developerCustomerRating?: number
  developerReputationScore?: number
  
  // Property
  carpetAreaSqft?: number
  superBuiltUpSqft?: number
  builtUpRatio?: number
  floorNumber?: number
  totalFloors?: number
  floorRatio?: number
  bedroomCount?: number
  bathroomCount?: number
  amenityCount?: number
  hasLift?: boolean
  hasGym?: boolean
  hasPool?: boolean
  parkingCount?: number
  furnishingStatus?: string
  propertyAgeYears?: number
  constructionQuality?: string
  
  // Market
  demandIndex?: number
  supplyIndex?: number
  inventoryMonths?: number
  absorptionRate?: number
  recentSalesCount?: number
  avgAppreciationPct?: number
  pricePerSqftAreaAvg?: number
  priceVolatilityScore?: number
  rentalYieldArea?: number
  vacancyRateArea?: number
  
  // Behavioral
  listingViewCount?: number
  saveCount?: number
  buyerInterestScore?: number
  contactRate?: number
  offerRate?: number
  daysOnMarket?: number
  priceDropCount?: number
  
  // Legal
  reraRegistered?: boolean
  reraNumber?: string
  reraCompletionPct?: number
  hasEncumbrance?: boolean
  ownershipType?: string
  litigationCount?: number
  documentCompletenessScore?: number
  
  // Media
  imageQualityScore?: number
  mediaCount?: number
  has3dTour?: boolean
  mediaTrustScore?: number
  hasDefectsDetected?: boolean
  
  // Completeness
  completeness: number  // 0-100 % of features populated
}

// ─── Get Feature Vector (with cache) ──────────────────────────────────────────

export async function getFeatureVector(
  entityId: string,
  entityType: EntityType,
  options: { forceRefresh?: boolean } = {}
): Promise<FeatureVector | null> {
  const { forceRefresh = false } = options

  // Check cache first
  if (!forceRefresh) {
    const cached = await prisma.propertyFeatureVector.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    })

    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return deserializeFeatureVector(cached)
    }
  }

  // Build from source data
  const built = await buildFeatureVector(entityId, entityType)
  if (!built) return null

  // Persist to DB (upsert)
  await persistFeatureVector(built)

  return built
}

// ─── Build Feature Vector from Source Data ────────────────────────────────────

async function buildFeatureVector(
  entityId: string,
  entityType: EntityType
): Promise<FeatureVector | null> {
  const vector: FeatureVector = {
    entityId,
    entityType,
    completeness: 0,
  }

  if (entityType === 'MANUAL_PROPERTY') {
    await buildFromManualProperty(entityId, vector)
  } else if (entityType === 'PROJECT') {
    await buildFromProject(entityId, vector)
  } else {
    return null
  }

  // Enrich with knowledge graph edges (GIS distances)
  await enrichWithKnowledgeGraph(entityId, entityType, vector)

  // Enrich with market intelligence
  await enrichWithMarketData(vector)

  // Enrich with developer intelligence
  await enrichWithDeveloperData(entityId, entityType, vector)

  // Compute completeness
  vector.completeness = computeCompleteness(vector)

  return vector
}

async function buildFromManualProperty(entityId: string, vector: FeatureVector): Promise<void> {
  const prop = await prisma.manualProperty.findUnique({
    where: { id: entityId },
    include: {
      media: true,
      agent: { include: { metrics: true, reviews: true } },
    },
  })

  if (!prop) return

  vector.latitude = prop.latitude ?? undefined
  vector.longitude = prop.longitude ?? undefined
  vector.carpetAreaSqft = prop.squareFeet > 0 ? prop.squareFeet : undefined
  vector.bedroomCount = prop.bedrooms > 0 ? prop.bedrooms : undefined
  vector.bathroomCount = prop.bathrooms > 0 ? prop.bathrooms : undefined
  vector.furnishingStatus = undefined   // not in schema yet — future field
  vector.hasLift = extractAmenityFlag(prop.amenities, ['lift', 'elevator'])
  vector.hasGym = extractAmenityFlag(prop.amenities, ['gym', 'fitness'])
  vector.hasPool = extractAmenityFlag(prop.amenities, ['pool', 'swimming'])
  vector.has3dTour = Boolean(prop.tour3dUrl)
  vector.mediaCount = prop.media.length
  vector.reraRegistered = false  // default — enriched from AITitle later
  vector.litigationCount = 0

  // Agent intelligence from related data
  if (prop.agent?.metrics) {
    const m = prop.agent.metrics
    vector.contactRate = m.responseRate ?? undefined
  }
  if (prop.agent?.reviews && prop.agent.reviews.length > 0) {
    const ratings = prop.agent.reviews.map(r => r.rating)
    vector.agentReviewRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    vector.agentReviewCount = ratings.length
  }
}

async function buildFromProject(entityId: string, vector: FeatureVector): Promise<void> {
  const proj = await prisma.project.findUnique({
    where: { id: entityId },
    include: {
      developer: true,
      unitTypes: true,
    },
  })

  if (!proj) return

  // Basic fields
  vector.latitude = (proj as any).latitude ?? undefined
  vector.longitude = (proj as any).longitude ?? undefined

  // Developer intelligence from linked developer
  if (proj.developer) {
    const dev = proj.developer
    vector.developerCustomerRating = dev.customerRating ?? undefined
    vector.developerPastProjects = dev.projectsDelivered ?? undefined
    vector.developerReputationScore = dev.customerRating
      ? Math.min(100, (dev.customerRating / 5) * 100)
      : undefined
  }

  // Completion year → property age estimation
  if (proj.completionYear) {
    const currentYear = new Date().getFullYear()
    vector.propertyAgeYears = Math.max(0, currentYear - proj.completionYear)
  }

  // RERA registration
  vector.reraRegistered = false  // enriched from AITitle later
}

// ─── Knowledge Graph Enrichment (GIS distances) ───────────────────────────────

async function enrichWithKnowledgeGraph(
  entityId: string,
  entityType: EntityType,
  vector: FeatureVector
): Promise<void> {
  const edges = await prisma.propertyKnowledgeEdge.findMany({
    where: { sourceType: entityType, sourceId: entityId },
    orderBy: { distanceKm: 'asc' },
  })

  let nearestMetro: number | undefined
  let nearestAirport: number | undefined
  let nearestHospital: number | undefined
  let nearestSchool: number | undefined
  let nearestMall: number | undefined
  let nearestItHub: number | undefined
  let nearestHighway: number | undefined
  let metroCount = 0
  let schoolCount = 0
  let hospitalCount = 0

  for (const edge of edges) {
    const km = edge.distanceKm ?? undefined
    switch (edge.edgeType) {
      case 'PROPERTY_NEAR_METRO':
        if (!nearestMetro || (km && km < nearestMetro)) nearestMetro = km
        metroCount++
        break
      case 'PROPERTY_NEAR_AIRPORT':
        if (!nearestAirport || (km && km < nearestAirport)) nearestAirport = km
        break
      case 'PROPERTY_NEAR_HOSPITAL':
        if (!nearestHospital || (km && km < nearestHospital)) nearestHospital = km
        hospitalCount++
        break
      case 'PROPERTY_NEAR_SCHOOL':
        if (!nearestSchool || (km && km < nearestSchool)) nearestSchool = km
        schoolCount++
        break
      case 'PROPERTY_NEAR_MALL':
        if (!nearestMall || (km && km < nearestMall)) nearestMall = km
        break
      case 'PROPERTY_NEAR_IT_HUB':
        if (!nearestItHub || (km && km < nearestItHub)) nearestItHub = km
        break
      case 'PROPERTY_NEAR_HIGHWAY':
        if (!nearestHighway || (km && km < nearestHighway)) nearestHighway = km
        break
    }
  }

  vector.distanceMetroKm = nearestMetro
  vector.distanceAirportKm = nearestAirport
  vector.distanceHospitalKm = nearestHospital
  vector.distanceSchoolKm = nearestSchool
  vector.distanceMallKm = nearestMall
  vector.distanceItHubKm = nearestItHub
  vector.distanceHighwayKm = nearestHighway
  vector.nearbyMetroCount = metroCount
  vector.nearbySchoolCount = schoolCount
  vector.nearbyHospitalCount = hospitalCount

  // Compute walk score based on proximity
  if (nearestMetro !== undefined) {
    vector.connectivityScore = Math.max(0, Math.min(100, 100 - nearestMetro * 20))
  }
}

// ─── Market Data Enrichment ───────────────────────────────────────────────────

async function enrichWithMarketData(vector: FeatureVector): Promise<void> {
  // This will be populated by MarketSnapshot when data ingestion is running.
  // For now we query the latest snapshot for the area.
  // entityId/entityType → city/community from the property record
  // Market enrichment happens post-ingestion — skip if no snapshot exists
}

// ─── Developer Enrichment ─────────────────────────────────────────────────────

async function enrichWithDeveloperData(
  entityId: string,
  entityType: EntityType,
  vector: FeatureVector
): Promise<void> {
  // Already handled in buildFromProject for PROJECT type.
  // For MANUAL_PROPERTY, developer info comes from the developerName field
  // until developer profiles are fully linked.
}

// ─── Persist to PropertyFeatureVector table ───────────────────────────────────

async function persistFeatureVector(vector: FeatureVector): Promise<void> {
  const expiresAt = new Date(Date.now() + FEATURE_TTL_MS.BEHAVIORAL)

  try {
    await prisma.propertyFeatureVector.upsert({
      where: { entityType_entityId: { entityType: vector.entityType, entityId: vector.entityId } },
      create: {
        entityType: vector.entityType,
        entityId: vector.entityId,
        ...mapVectorToDb(vector),
        featureCompleteness: vector.completeness,
        computedAt: new Date(),
        expiresAt,
      },
      update: {
        ...mapVectorToDb(vector),
        featureCompleteness: vector.completeness,
        computedAt: new Date(),
        expiresAt,
      },
    })
  } catch (err) {
    // Non-fatal: log and continue
    console.error('[FeatureStore] Failed to persist feature vector:', err)
  }
}

function mapVectorToDb(v: FeatureVector) {
  return {
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
    distanceMetroKm: v.distanceMetroKm ?? null,
    distanceAirportKm: v.distanceAirportKm ?? null,
    distanceHospitalKm: v.distanceHospitalKm ?? null,
    distanceSchoolKm: v.distanceSchoolKm ?? null,
    distanceMallKm: v.distanceMallKm ?? null,
    distanceItHubKm: v.distanceItHubKm ?? null,
    distanceHighwayKm: v.distanceHighwayKm ?? null,
    walkScore: v.walkScore ?? null,
    connectivityScore: v.connectivityScore ?? null,
    nearbyMetroCount: v.nearbyMetroCount ?? null,
    nearbySchoolCount: v.nearbySchoolCount ?? null,
    nearbyHospitalCount: v.nearbyHospitalCount ?? null,
    developerPastProjects: v.developerPastProjects ?? null,
    developerDelayPct: v.developerDelayPct ?? null,
    developerQualityRating: v.developerQualityRating ?? null,
    developerLitigationCount: v.developerLitigationCount ?? null,
    developerCompletionRate: v.developerCompletionRate ?? null,
    developerCustomerRating: v.developerCustomerRating ?? null,
    developerReputationScore: v.developerReputationScore ?? null,
    carpetAreaSqft: v.carpetAreaSqft ?? null,
    bedroomCount: v.bedroomCount ?? null,
    bathroomCount: v.bathroomCount ?? null,
    floorNumber: v.floorNumber ?? null,
    totalFloors: v.totalFloors ?? null,
    floorRatio: v.floorRatio ?? null,
    hasLift: v.hasLift ?? null,
    hasGym: v.hasGym ?? null,
    hasPool: v.hasPool ?? null,
    parkingCount: v.parkingCount ?? null,
    furnishingStatus: v.furnishingStatus ?? null,
    propertyAgeYears: v.propertyAgeYears ?? null,
    amenityCount: v.amenityCount ?? null,
    demandIndex: v.demandIndex ?? null,
    supplyIndex: v.supplyIndex ?? null,
    inventoryMonths: v.inventoryMonths ?? null,
    absorptionRate: v.absorptionRate ?? null,
    recentSalesCount: v.recentSalesCount ?? null,
    avgAppreciationPct: v.avgAppreciationPct ?? null,
    pricePerSqftAreaAvg: v.pricePerSqftAreaAvg ?? null,
    priceVolatilityScore: v.priceVolatilityScore ?? null,
    rentalYieldArea: v.rentalYieldArea ?? null,
    vacancyRateArea: v.vacancyRateArea ?? null,
    listingViewCount: v.listingViewCount ?? 0,
    saveCount: v.saveCount ?? 0,
    buyerInterestScore: v.buyerInterestScore ?? null,
    contactRate: v.contactRate ?? null,
    offerRate: v.offerRate ?? null,
    daysOnMarket: v.daysOnMarket ?? null,
    priceDropCount: v.priceDropCount ?? null,
    reraRegistered: v.reraRegistered ?? false,
    reraNumber: v.reraNumber ?? null,
    reraCompletionPct: v.reraCompletionPct ?? null,
    hasEncumbrance: v.hasEncumbrance ?? null,
    ownershipType: v.ownershipType ?? null,
    litigationCount: v.litigationCount ?? null,
    documentCompletenessScore: v.documentCompletenessScore ?? null,
    imageQualityScore: v.imageQualityScore ?? null,
    mediaCount: v.mediaCount ?? 0,
    has3dTour: v.has3dTour ?? false,
    mediaTrustScore: v.mediaTrustScore ?? null,
    hasDefectsDetected: v.hasDefectsDetected ?? null,
  }
}

// ─── Deserialize from DB row ──────────────────────────────────────────────────

function deserializeFeatureVector(row: any): FeatureVector {
  return {
    entityId: row.entityId,
    entityType: row.entityType as EntityType,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    distanceMetroKm: row.distanceMetroKm ?? undefined,
    distanceAirportKm: row.distanceAirportKm ?? undefined,
    distanceHospitalKm: row.distanceHospitalKm ?? undefined,
    distanceSchoolKm: row.distanceSchoolKm ?? undefined,
    distanceMallKm: row.distanceMallKm ?? undefined,
    distanceItHubKm: row.distanceItHubKm ?? undefined,
    distanceHighwayKm: row.distanceHighwayKm ?? undefined,
    walkScore: row.walkScore ?? undefined,
    connectivityScore: row.connectivityScore ?? undefined,
    nearbyMetroCount: row.nearbyMetroCount ?? undefined,
    nearbySchoolCount: row.nearbySchoolCount ?? undefined,
    nearbyHospitalCount: row.nearbyHospitalCount ?? undefined,
    developerPastProjects: row.developerPastProjects ?? undefined,
    developerDelayPct: row.developerDelayPct ?? undefined,
    developerQualityRating: row.developerQualityRating ?? undefined,
    developerLitigationCount: row.developerLitigationCount ?? undefined,
    developerCompletionRate: row.developerCompletionRate ?? undefined,
    developerCustomerRating: row.developerCustomerRating ?? undefined,
    developerReputationScore: row.developerReputationScore ?? undefined,
    carpetAreaSqft: row.carpetAreaSqft ?? undefined,
    bedroomCount: row.bedroomCount ?? undefined,
    bathroomCount: row.bathroomCount ?? undefined,
    floorNumber: row.floorNumber ?? undefined,
    totalFloors: row.totalFloors ?? undefined,
    floorRatio: row.floorRatio ?? undefined,
    hasLift: row.hasLift ?? undefined,
    hasGym: row.hasGym ?? undefined,
    hasPool: row.hasPool ?? undefined,
    parkingCount: row.parkingCount ?? undefined,
    furnishingStatus: row.furnishingStatus ?? undefined,
    propertyAgeYears: row.propertyAgeYears ?? undefined,
    amenityCount: row.amenityCount ?? undefined,
    demandIndex: row.demandIndex ?? undefined,
    supplyIndex: row.supplyIndex ?? undefined,
    inventoryMonths: row.inventoryMonths ?? undefined,
    absorptionRate: row.absorptionRate ?? undefined,
    recentSalesCount: row.recentSalesCount ?? undefined,
    avgAppreciationPct: row.avgAppreciationPct ?? undefined,
    pricePerSqftAreaAvg: row.pricePerSqftAreaAvg ?? undefined,
    priceVolatilityScore: row.priceVolatilityScore ?? undefined,
    rentalYieldArea: row.rentalYieldArea ?? undefined,
    vacancyRateArea: row.vacancyRateArea ?? undefined,
    listingViewCount: row.listingViewCount ?? 0,
    saveCount: row.saveCount ?? 0,
    buyerInterestScore: row.buyerInterestScore ?? undefined,
    contactRate: row.contactRate ?? undefined,
    offerRate: row.offerRate ?? undefined,
    daysOnMarket: row.daysOnMarket ?? undefined,
    priceDropCount: row.priceDropCount ?? undefined,
    reraRegistered: row.reraRegistered ?? false,
    reraNumber: row.reraNumber ?? undefined,
    reraCompletionPct: row.reraCompletionPct ?? undefined,
    hasEncumbrance: row.hasEncumbrance ?? undefined,
    ownershipType: row.ownershipType ?? undefined,
    litigationCount: row.litigationCount ?? undefined,
    documentCompletenessScore: row.documentCompletenessScore ?? undefined,
    imageQualityScore: row.imageQualityScore ?? undefined,
    mediaCount: row.mediaCount ?? 0,
    has3dTour: row.has3dTour ?? false,
    mediaTrustScore: row.mediaTrustScore ?? undefined,
    hasDefectsDetected: row.hasDefectsDetected ?? undefined,
    completeness: row.featureCompleteness ?? 0,
  }
}

// ─── Completeness Calculator ──────────────────────────────────────────────────

function computeCompleteness(v: FeatureVector): number {
  const KEY_FEATURES = [
    'latitude', 'longitude', 'carpetAreaSqft', 'bedroomCount', 'bathroomCount',
    'distanceMetroKm', 'distanceSchoolKm', 'distanceHospitalKm',
    'developerReputationScore', 'propertyAgeYears', 'amenityCount',
    'demandIndex', 'supplyIndex', 'inventoryMonths', 'pricePerSqftAreaAvg',
    'reraRegistered', 'mediaTrustScore', 'imageQualityScore',
    'connectivityScore', 'marketHeat',
  ] as const

  const populated = KEY_FEATURES.filter(k => {
    const val = (v as any)[k]
    return val !== undefined && val !== null
  }).length

  return Math.round((populated / KEY_FEATURES.length) * 100)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAmenityFlag(amenities: unknown, keywords: string[]): boolean | undefined {
  if (!amenities) return undefined
  const str = JSON.stringify(amenities).toLowerCase()
  return keywords.some(k => str.includes(k))
}

// ─── Type extension for agent review rating (not in FeatureVector yet) ─────
declare module './types' {
  interface FeatureVector {
    agentReviewRating?: number
    agentReviewCount?: number
    marketHeat?: string
  }
}
