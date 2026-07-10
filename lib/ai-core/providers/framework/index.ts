// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Provider Framework Barrel Export
// Phase 2: Provider Framework
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  IDataProvider,
  ProviderCategory,
  CollectionParams,
  ProviderCollectionResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProviderStatus,
  ProviderHealthStatus,
  FreshnessMetadata,
  RateLimitInfo,
  ProviderRegistration,
} from './types'

// ─── Registry ────────────────────────────────────────────────────────────────
export {
  registerProvider,
  unregisterProvider,
  getProviders,
  getProvider,
  getTemporaryProviders,
  getProductionProviders,
  getActiveCategories,
  getAllHealthStatuses,
  hasHealthyProvider,
  setProviderEnabled,
  setProviderPriority,
  getProviderCount,
  getRegistrySummary,
} from './registry'

// ─── Manager ─────────────────────────────────────────────────────────────────
export {
  collectFromCategory,
  collectFromProvider,
  processRawRecords,
  getAggregateHealth,
} from './manager'
