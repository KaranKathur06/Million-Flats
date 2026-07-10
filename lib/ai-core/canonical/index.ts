// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Canonical Models Barrel Export
// Phase 0: Intelligence Foundation
//
// Import all canonical types from this single entry point:
//   import { CanonicalProperty, CanonicalDeveloper, ... } from '@/lib/ai-core/canonical'
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Property ────────────────────────────────────────────────────────────────
export type {
  CanonicalProperty,
  PropertyConfiguration,
  PropertyType,
  PropertySubType,
  FurnishingStatus,
  ConstructionStatus,
  PropertyIntent,
  Facing,
  MarketSegment,
} from './property'

export {
  normalizePropertyType,
  normalizeFurnishing,
  classifyMarketSegment,
  normalizeAmenities,
} from './property'

// ─── Location ────────────────────────────────────────────────────────────────
export type {
  CanonicalLocation,
  LocationEntity,
  CountryEntity,
  POIProximity,
  POIType,
} from './location'

export {
  toMarketKey,
  toCityMarketKey,
  normalizeAddress,
  normalizeLocationName,
  toSlug,
  haversineDistance,
} from './location'

// ─── Developer ───────────────────────────────────────────────────────────────
export type {
  CanonicalDeveloper,
  DeveloperProjectSummary,
  DeveloperBrandTier,
} from './developer'

export {
  classifyBrandTier,
  computeReputationScore,
  computeDeliveryAccuracy,
} from './developer'

// ─── Market ──────────────────────────────────────────────────────────────────
export type {
  CanonicalMarketMetric,
  MarketSnapshotData,
  MarketTrendPoint,
  MarketMetricType,
  PeriodType,
  MetricUnit,
  MarketHeatLevel,
} from './market'

export {
  classifyMarketHeat,
  computeMarketHeatIndex,
  computeAffordabilityIndex,
} from './market'
