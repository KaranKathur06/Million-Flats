// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AI Evidence Engine
// Phase 8: Evidence Engine (Wave 1)
//
// Separates reusable EVIDENCE from REASONING.
// Evidence is collected once, then consumed by:
//   Recommendation Engine, Forecast Engine, Investment Engine,
//   Valuation Engine, Explainability Engine, and Report Generator.
//
// Every AI output traces back to evidence — no black-box responses.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { FeatureVector, ConfidenceResult } from '../types'
import type { ComparableResult, ScoredComparable } from './comparable'
import type { MarketSnapshotData } from '../canonical/market'
import type { DataQualityScore } from '../quality'
import { findComparables } from './comparable'
import { getOrGenerateSnapshot } from '../pipeline/snapshot-engine'
import { getNearbyPOIs, getEntityProfile } from '../knowledge-graph'
import { assessPropertyQuality } from '../quality'

// ─── Evidence Bundle ─────────────────────────────────────────────────────────
// The single source of truth for all evidence. Every AI engine consumes this.

export interface EvidenceBundle {
  /** Comparable property evidence */
  comparables: ComparableEvidence

  /** Market-level evidence from snapshots */
  market: MarketEvidence

  /** Infrastructure and POI evidence from knowledge graph */
  infrastructure: InfraEvidence

  /** Developer track record evidence */
  developer: DeveloperEvidence

  /** Behavioral signals from platform analytics */
  behavioral: BehavioralEvidence

  /** Risk-related evidence */
  risks: RiskEvidence[]

  /** Data quality assessment */
  quality: DataQualityScore

  /** Recent changes and noteworthy events */
  recentChanges: RecentChange[]

  /** Aggregate statistics */
  stats: EvidenceStats
}

// ─── Sub-Evidence Types ──────────────────────────────────────────────────────

export interface ComparableEvidence {
  /** Full comparable result with scored properties */
  result: ComparableResult
  /** Summary metrics */
  count: number
  avgSimilarity: number
  strongMatchCount: number             // similarity > 0.7
  pricePositionVsComparables: 'BELOW' | 'AT' | 'ABOVE' | 'UNKNOWN'
  priceDeviationPct: number            // % above/below comparable median
}

export interface MarketEvidence {
  /** Full market snapshot */
  snapshot: MarketSnapshotData | null
  /** Key metrics extracted */
  priceChangeYoyPct: number
  marketHeat: string                   // 'VERY_HOT' ... 'VERY_COLD'
  rentalYield: number
  demandSupplyRatio: number
  avgDaysOnMarket: number
  /** Is this demo data? */
  isDemo: boolean
}

export interface InfraEvidence {
  /** Nearby infrastructure summary */
  nearbyMetroCount: number
  nearbySchoolCount: number
  nearbyHospitalCount: number
  nearbyMallCount: number
  closestMetroKm: number | null
  closestSchoolKm: number | null
  closestHospitalKm: number | null
  /** Upcoming infrastructure that impacts value */
  upcomingProjects: InfraProject[]
  /** Connectivity score from knowledge graph */
  connectivityScore: number
}

export interface InfraProject {
  name: string
  type: string
  distanceKm: number
  estimatedImpactPct: number
  status: string
  timelineMonths?: number
}

export interface DeveloperEvidence {
  name: string | null
  brandTier: string | null
  completionRate: number | null
  customerRating: number | null
  totalDelivered: number | null
  litigationCount: number | null
  reputationScore: number | null
  hasData: boolean
}

export interface BehavioralEvidence {
  /** Platform engagement signals */
  viewCount30d: number
  enquiryRate: number                  // view-to-enquiry ratio
  saveRate: number                     // view-to-save ratio
  avgTimeOnPageSec: number
  /** Demand signals */
  demandTrend: 'RISING' | 'STABLE' | 'FALLING' | 'UNKNOWN'
  hasData: boolean
}

export interface RiskEvidence {
  category: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  mitigation?: string
}

export interface RecentChange {
  type: 'PRICE_CHANGE' | 'MARKET_SHIFT' | 'INFRASTRUCTURE' | 'DEMAND' | 'LISTING'
  date: string
  description: string
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  magnitude?: number                   // % change if applicable
}

export interface EvidenceStats {
  totalDataPoints: number
  sourceCount: number
  comparableCount: number
  marketDataAge: string | null         // "2 hours ago", "1 day ago"
  confidenceImpact: 'HIGH' | 'MEDIUM' | 'LOW'
  demoDataPresent: boolean
}

// ─── Collect Evidence ────────────────────────────────────────────────────────

/**
 * Collect all evidence for a property from every available source.
 * This is the single entry point — all engines call this instead of
 * individually querying comparables, market data, etc.
 */
export async function collectEvidence(
  features: FeatureVector
): Promise<EvidenceBundle> {
  // ── Parallel evidence collection ───────────────────────────────────────────
  const [
    comparableResult,
    marketSnapshot,
    nearbyPOIs,
    entityProfile,
  ] = await Promise.allSettled([
    findComparables(features, { limit: 20 }),
    features.city
      ? getOrGenerateSnapshot(features.countryIso2 ?? 'AE', features.city, features.community ?? undefined)
      : Promise.resolve(null),
    features.entityId
      ? getNearbyPOIs(features.entityId, 'PROPERTY', 5)
      : Promise.resolve([]),
    features.entityId
      ? getEntityProfile(features.entityId, 'PROPERTY')
      : Promise.resolve(null),
  ])

  // ── Extract results (handle failures gracefully) ───────────────────────────
  const comps = comparableResult.status === 'fulfilled' ? comparableResult.value : null
  const snapshot = marketSnapshot.status === 'fulfilled' ? marketSnapshot.value : null
  const pois = nearbyPOIs.status === 'fulfilled' ? nearbyPOIs.value : []
  const profile = entityProfile.status === 'fulfilled' ? entityProfile.value : null

  // ── Build comparable evidence ──────────────────────────────────────────────
  const comparableEvidence = buildComparableEvidence(comps, features)

  // ── Build market evidence ──────────────────────────────────────────────────
  const marketEvidence = buildMarketEvidence(snapshot)

  // ── Build infrastructure evidence ──────────────────────────────────────────
  const infraEvidence = buildInfraEvidence(pois, profile)

  // ── Build developer evidence ───────────────────────────────────────────────
  const developerEvidence = buildDeveloperEvidence(features)

  // ── Build behavioral evidence (placeholder — needs analytics integration) ─
  const behavioralEvidence: BehavioralEvidence = {
    viewCount30d: 0,
    enquiryRate: 0,
    saveRate: 0,
    avgTimeOnPageSec: 0,
    demandTrend: 'UNKNOWN',
    hasData: false,
  }

  // ── Build risk evidence ────────────────────────────────────────────────────
  const risks = buildRiskEvidence(features, snapshot, infraEvidence)

  // ── Build recent changes ───────────────────────────────────────────────────
  const recentChanges = buildRecentChanges(snapshot)

  // ── Assess data quality ────────────────────────────────────────────────────
  const quality = assessPropertyQuality(
    features as unknown as Record<string, unknown>,
    85, // Default confidence for feature store data
    false,
    1 // Assume recent data
  )

  // ── Compute stats ──────────────────────────────────────────────────────────
  const totalDataPoints =
    (comps?.totalFound ?? 0) +
    (snapshot ? 20 : 0) +    // ~20 metrics per snapshot
    pois.length +
    (profile?.neighbors.length ?? 0)

  const sourceCount = new Set([
    'FEATURE_STORE',
    ...(comps ? ['COMPARABLE_ENGINE'] : []),
    ...(snapshot ? ['MARKET_SNAPSHOT'] : []),
    ...(pois.length > 0 ? ['KNOWLEDGE_GRAPH'] : []),
  ]).size

  const demoDataPresent = snapshot !== null && (snapshot as any)?.source === 'DEMO_MARKET_DATA'
  const snapshotAge = snapshot?.snapshotAt
    ? formatAge(new Date(snapshot.snapshotAt))
    : null

  const stats: EvidenceStats = {
    totalDataPoints,
    sourceCount,
    comparableCount: comps?.totalFound ?? 0,
    marketDataAge: snapshotAge,
    confidenceImpact: totalDataPoints > 50 ? 'HIGH' : totalDataPoints > 20 ? 'MEDIUM' : 'LOW',
    demoDataPresent,
  }

  return {
    comparables: comparableEvidence,
    market: marketEvidence,
    infrastructure: infraEvidence,
    developer: developerEvidence,
    behavioral: behavioralEvidence,
    risks,
    quality,
    recentChanges,
    stats,
  }
}

// ─── Builders ────────────────────────────────────────────────────────────────

function buildComparableEvidence(
  result: ComparableResult | null,
  features: FeatureVector
): ComparableEvidence {
  if (!result || result.totalFound === 0) {
    return {
      result: result ?? {
        totalFound: 0,
        priceComparables: [],
        investmentComparables: [],
        rentalComparables: [],
        developerComparables: [],
        marketStats: { count: 0, avgPricePerSqft: 0, medianPricePerSqft: 0, minPricePerSqft: 0, maxPricePerSqft: 0, stdDevPricePerSqft: 0, avgPrice: 0, medianPrice: 0 },
        meta: { searchRadiusKm: 10, matchedCommunity: false, matchedCity: false, computedAt: new Date().toISOString(), durationMs: 0 },
      },
      count: 0,
      avgSimilarity: 0,
      strongMatchCount: 0,
      pricePositionVsComparables: 'UNKNOWN',
      priceDeviationPct: 0,
    }
  }

  const allComps = result.priceComparables
  const avgSim = allComps.length > 0
    ? allComps.reduce((s, c) => s + c.similarityScore, 0) / allComps.length
    : 0
  const strongMatches = allComps.filter(c => c.similarityScore > 0.7).length

  // Price position
  const subjectPPS = features.pricePerSqft ?? 0
  const medianPPS = result.marketStats.medianPricePerSqft
  let pricePosition: ComparableEvidence['pricePositionVsComparables'] = 'UNKNOWN'
  let priceDeviation = 0

  if (subjectPPS > 0 && medianPPS > 0) {
    priceDeviation = ((subjectPPS - medianPPS) / medianPPS) * 100
    if (priceDeviation > 5) pricePosition = 'ABOVE'
    else if (priceDeviation < -5) pricePosition = 'BELOW'
    else pricePosition = 'AT'
  }

  return {
    result,
    count: result.totalFound,
    avgSimilarity: Math.round(avgSim * 100) / 100,
    strongMatchCount: strongMatches,
    pricePositionVsComparables: pricePosition,
    priceDeviationPct: Math.round(priceDeviation * 10) / 10,
  }
}

function buildMarketEvidence(snapshot: MarketSnapshotData | null): MarketEvidence {
  if (!snapshot) {
    return {
      snapshot: null,
      priceChangeYoyPct: 0,
      marketHeat: 'NEUTRAL',
      rentalYield: 0,
      demandSupplyRatio: 1,
      avgDaysOnMarket: 0,
      isDemo: false,
    }
  }

  const heat = snapshot.marketHeatIndex >= 90 ? 'VERY_HOT'
    : snapshot.marketHeatIndex >= 75 ? 'HOT'
    : snapshot.marketHeatIndex >= 60 ? 'WARM'
    : snapshot.marketHeatIndex >= 45 ? 'NEUTRAL'
    : snapshot.marketHeatIndex >= 30 ? 'COOL'
    : snapshot.marketHeatIndex >= 15 ? 'COLD'
    : 'VERY_COLD'

  return {
    snapshot,
    priceChangeYoyPct: snapshot.priceChangeYoyPct,
    marketHeat: heat,
    rentalYield: snapshot.rentalYieldAvg,
    demandSupplyRatio: snapshot.supplyIndex > 0
      ? snapshot.demandIndex / snapshot.supplyIndex
      : 1,
    avgDaysOnMarket: snapshot.avgDaysOnMarket,
    isDemo: false, // Would check source field in production
  }
}

function buildInfraEvidence(
  pois: Array<{ entity: any; edge: any }>,
  profile: any
): InfraEvidence {
  const byType = (type: string) => pois.filter(p =>
    p.entity.type === type || p.edge.relationshipType === 'NEAR'
  )

  const metros = pois.filter(p => p.entity.type === 'METRO_STATION')
  const schools = pois.filter(p => p.entity.type === 'SCHOOL')
  const hospitals = pois.filter(p => p.entity.type === 'HOSPITAL')
  const malls = pois.filter(p => p.entity.type === 'MALL')

  const closestOf = (items: Array<{ edge: any }>) => {
    const distances = items
      .map(i => i.edge.properties.distanceKm)
      .filter((d): d is number => d !== undefined && d !== null)
    return distances.length > 0 ? Math.min(...distances) : null
  }

  // Extract upcoming infra projects from profile
  const upcomingProjects: InfraProject[] = (profile?.neighbors ?? [])
    .filter((n: any) => n.edge.relationshipType === 'IMPACTS')
    .map((n: any) => ({
      name: n.entity.name ?? 'Infrastructure project',
      type: n.entity.type,
      distanceKm: n.edge.properties.distanceKm ?? 0,
      estimatedImpactPct: n.edge.properties.estimatedImpactPct ?? 0,
      status: n.edge.properties.status ?? 'UNKNOWN',
      timelineMonths: n.edge.properties.timelineMonths,
    }))

  const connectivityScore = Math.min(100,
    metros.length * 15 +
    schools.length * 5 +
    hospitals.length * 5 +
    malls.length * 5 +
    (metros.length > 0 && closestOf(metros)! < 1 ? 20 : 0)
  )

  return {
    nearbyMetroCount: metros.length,
    nearbySchoolCount: schools.length,
    nearbyHospitalCount: hospitals.length,
    nearbyMallCount: malls.length,
    closestMetroKm: closestOf(metros),
    closestSchoolKm: closestOf(schools),
    closestHospitalKm: closestOf(hospitals),
    upcomingProjects,
    connectivityScore,
  }
}

function buildDeveloperEvidence(features: FeatureVector): DeveloperEvidence {
  return {
    name: features.developerName ?? null,
    brandTier: features.developerBrandTier ?? null,
    completionRate: features.developerCompletionRate ?? null,
    customerRating: features.developerCustomerRating ?? null,
    totalDelivered: features.developerProjectsDelivered ?? null,
    litigationCount: features.developerLitigation ?? null,
    reputationScore: null, // Computed from canonical developer model
    hasData: !!features.developerName,
  }
}

function buildRiskEvidence(
  features: FeatureVector,
  snapshot: MarketSnapshotData | null,
  infra: InfraEvidence
): RiskEvidence[] {
  const risks: RiskEvidence[] = []

  // Market risk
  if (snapshot && snapshot.priceChangeYoyPct < -5) {
    risks.push({
      category: 'Market',
      severity: snapshot.priceChangeYoyPct < -10 ? 'HIGH' : 'MEDIUM',
      description: `Market prices declined ${Math.abs(snapshot.priceChangeYoyPct)}% year-over-year`,
      mitigation: 'Consider longer holding period to ride out the correction',
    })
  }

  // Liquidity risk
  if (snapshot && snapshot.avgDaysOnMarket > 90) {
    risks.push({
      category: 'Liquidity',
      severity: snapshot.avgDaysOnMarket > 180 ? 'HIGH' : 'MEDIUM',
      description: `Average ${snapshot.avgDaysOnMarket} days on market — exit may be slow`,
      mitigation: 'Price competitively or target rental income while waiting for buyer',
    })
  }

  // Infrastructure risk (no nearby transit)
  if (infra.nearbyMetroCount === 0 && infra.closestMetroKm === null) {
    risks.push({
      category: 'Infrastructure',
      severity: 'MEDIUM',
      description: 'No metro station within 5km — may impact rental demand and resale',
    })
  }

  // Developer risk
  if (features.developerLitigation && features.developerLitigation > 2) {
    risks.push({
      category: 'Developer',
      severity: features.developerLitigation > 5 ? 'HIGH' : 'MEDIUM',
      description: `Developer has ${features.developerLitigation} active litigation cases`,
      mitigation: 'Verify construction progress independently',
    })
  }

  // Oversupply risk
  if (snapshot && snapshot.inventoryMonths > 8) {
    risks.push({
      category: 'Oversupply',
      severity: snapshot.inventoryMonths > 12 ? 'HIGH' : 'MEDIUM',
      description: `${snapshot.inventoryMonths} months of inventory — market is oversupplied`,
    })
  }

  return risks
}

function buildRecentChanges(snapshot: MarketSnapshotData | null): RecentChange[] {
  const changes: RecentChange[] = []

  if (snapshot) {
    if (Math.abs(snapshot.priceChangeMomPct) > 1) {
      changes.push({
        type: 'MARKET_SHIFT',
        date: snapshot.snapshotAt,
        description: `Market prices ${snapshot.priceChangeMomPct > 0 ? 'increased' : 'decreased'} ${Math.abs(snapshot.priceChangeMomPct)}% this month`,
        impact: snapshot.priceChangeMomPct > 0 ? 'POSITIVE' : 'NEGATIVE',
        magnitude: snapshot.priceChangeMomPct,
      })
    }

    if (snapshot.demandIndex > 70) {
      changes.push({
        type: 'DEMAND',
        date: snapshot.snapshotAt,
        description: 'High demand detected in this market',
        impact: 'POSITIVE',
        magnitude: snapshot.demandIndex,
      })
    }
  }

  return changes
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'Less than 1 hour ago'
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
