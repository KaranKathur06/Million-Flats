// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Provider Framework Types
// Phase 2: Provider Framework
//
// Provider-agnostic data ingestion contracts.
// Any data source implements IDataProvider and becomes plug-and-play.
// Business logic NEVER checks provider name — only consumes normalized data.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Provider Categories ─────────────────────────────────────────────────────

export type ProviderCategory =
  | 'PLATFORM_LISTINGS'      // MillionFlats own data
  | 'PUBLIC_LISTINGS'        // Public listing providers
  | 'DEVELOPER_DATA'         // Developer websites
  | 'GOVERNMENT'             // Government datasets (DLD, RERA, etc.)
  | 'MAPS_POI'               // Maps & POI providers (Google Maps, etc.)
  | 'INFRASTRUCTURE'         // Infrastructure providers
  | 'MARKET_INDICATORS'      // Market indicator providers
  | 'TRANSACTION_DATA'       // Transaction record providers

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface IDataProvider<TRaw = unknown, TNormalized = unknown> {
  /** Unique provider identifier */
  readonly name: string

  /** Human-readable display name */
  readonly displayName: string

  /** What category of data this provider supplies */
  readonly category: ProviderCategory

  /**
   * If true, this provider uses demonstration/sample data and must be
   * replaced with a licensed/production source before launch.
   * UI shows "Demo Data" badge when source === this provider.
   */
  readonly isTemporary: boolean

  /**
   * Collect raw data from the provider.
   * This is the only method that makes external calls.
   */
  collect(params: CollectionParams): Promise<ProviderCollectionResult<TRaw>>

  /**
   * Validate a single raw record.
   * Returns validation errors if any.
   */
  validate(raw: TRaw): ValidationResult

  /**
   * Transform a raw record into the canonical normalized form.
   * This MUST produce a canonical model (CanonicalProperty, etc.)
   */
  normalize(raw: TRaw): TNormalized

  /**
   * Remove duplicates from a list of normalized records.
   * Uses provider-specific dedup logic (address matching, coordinate matching, etc.)
   */
  deduplicate(items: TNormalized[]): TNormalized[]

  /**
   * Get current health status of the provider.
   */
  getHealth(): ProviderHealthStatus

  /**
   * Get freshness metadata (when data was last fetched, how old it is).
   */
  getFreshness(): FreshnessMetadata

  /**
   * Get overall confidence in this provider's data quality.
   * 0-100 scale.
   */
  getConfidence(): number
}

// ─── Collection Parameters ───────────────────────────────────────────────────

export interface CollectionParams {
  /** Country ISO2 code to filter by */
  countryIso2?: string

  /** City to filter by */
  city?: string

  /** Community to filter by */
  community?: string

  /** Maximum number of records to collect */
  limit?: number

  /** Pagination offset */
  offset?: number

  /** Only collect records updated since this date */
  since?: Date

  /** Force refresh even if cache is valid */
  forceRefresh?: boolean

  /** Additional provider-specific parameters */
  extra?: Record<string, unknown>
}

// ─── Collection Result ───────────────────────────────────────────────────────

export interface ProviderCollectionResult<T> {
  /** Whether the collection succeeded */
  success: boolean

  /** Collected records */
  data: T[]

  /** Error message if failed */
  error?: string

  /** Provider that collected this data */
  source: string

  /** When the collection started */
  fetchedAt: string

  /** How long the collection took in milliseconds */
  latencyMs: number

  /** Total records available (for pagination) */
  totalAvailable?: number

  /** Rate limit info */
  rateLimit?: RateLimitInfo
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

// ─── Health Status ───────────────────────────────────────────────────────────

export type ProviderStatus =
  | 'HEALTHY'           // All good
  | 'DEGRADED'          // Partial issues but still functional
  | 'UNHEALTHY'         // Major issues, data may be stale
  | 'OFFLINE'           // Provider is down

export interface ProviderHealthStatus {
  status: ProviderStatus
  lastCheckAt: string               // ISO date
  lastSuccessAt?: string            // ISO date of last successful collection
  lastErrorAt?: string              // ISO date of last error
  lastError?: string                // Last error message
  successRate: number               // 0-100 over last 24h
  avgLatencyMs: number              // Average response time
  totalRequests24h: number
  totalErrors24h: number
}

// ─── Freshness ───────────────────────────────────────────────────────────────

export interface FreshnessMetadata {
  lastFetchAt?: string              // When data was last collected
  oldestRecordAt?: string           // Age of oldest record in current dataset
  newestRecordAt?: string           // Age of newest record
  ttlSeconds: number                // How long before data should be refreshed
  isStale: boolean                  // Is the data past its TTL?
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

export interface RateLimitInfo {
  remaining: number
  limit: number
  resetAt: string                   // ISO date when limit resets
}

// ─── Provider Registration ───────────────────────────────────────────────────

export interface ProviderRegistration {
  provider: IDataProvider
  priority: number                  // Higher = preferred when multiple providers for same category
  enabled: boolean
  config?: Record<string, unknown>
}
