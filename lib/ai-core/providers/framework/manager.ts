// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Provider Manager
// Phase 2: Provider Framework
//
// Lifecycle management for data providers:
//   - Concurrent collection across multiple providers
//   - Rate limiting per provider
//   - Retry logic with exponential backoff
//   - Circuit breaker pattern (auto-disable failing providers)
//   - Health status aggregation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  IDataProvider,
  CollectionParams,
  ProviderCollectionResult,
  ProviderCategory,
  ValidationResult,
} from './types'
import { getProviders } from './registry'

// ─── Collection Options ──────────────────────────────────────────────────────

interface CollectOptions {
  /** Maximum concurrent provider calls */
  concurrency?: number
  /** Timeout per provider in milliseconds */
  timeoutMs?: number
  /** Maximum retries per provider on failure */
  maxRetries?: number
  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs?: number
  /** If true, collect from all providers; if false, stop at first success */
  collectAll?: boolean
}

const DEFAULT_OPTIONS: Required<CollectOptions> = {
  concurrency: 5,
  timeoutMs: 30_000,
  maxRetries: 2,
  retryBaseDelayMs: 1000,
  collectAll: true,
}

// ─── Circuit Breaker State ───────────────────────────────────────────────────

interface CircuitState {
  failures: number
  lastFailureAt: number
  isOpen: boolean                    // true = circuit is open (blocking requests)
  openedAt?: number
}

const circuitStates = new Map<string, CircuitState>()
const CIRCUIT_FAILURE_THRESHOLD = 5
const CIRCUIT_RESET_MS = 5 * 60 * 1000 // 5 minutes

// ─── Collect from Category ───────────────────────────────────────────────────

/**
 * Collect data from all enabled providers in a given category.
 * Runs providers concurrently with rate limiting and circuit breaker protection.
 */
export async function collectFromCategory<T>(
  category: ProviderCategory,
  params: CollectionParams,
  options: CollectOptions = {}
): Promise<ProviderCollectionResult<T>[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const providers = getProviders(category)

  if (providers.length === 0) {
    return []
  }

  // Filter out providers with open circuits
  const available = providers.filter(p => !isCircuitOpen(p.name))

  // Collect concurrently with concurrency limit
  const results: ProviderCollectionResult<T>[] = []
  const batches = chunk(available, opts.concurrency)

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map(provider =>
        collectWithRetry<T>(provider, params, opts)
      )
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)

        // If not collecting all, stop at first success
        if (!opts.collectAll && result.value.success) {
          return results
        }
      } else {
        // Promise.allSettled shouldn't reject, but handle just in case
        results.push({
          success: false,
          data: [],
          error: result.reason?.message ?? 'Unknown error',
          source: 'unknown',
          fetchedAt: new Date().toISOString(),
          latencyMs: 0,
        })
      }
    }
  }

  return results
}

// ─── Collect from Single Provider ────────────────────────────────────────────

/**
 * Collect data from a specific provider by name.
 */
export async function collectFromProvider<T>(
  provider: IDataProvider,
  params: CollectionParams,
  options: CollectOptions = {}
): Promise<ProviderCollectionResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (isCircuitOpen(provider.name)) {
    return {
      success: false,
      data: [],
      error: `Circuit breaker open for provider "${provider.name}". Will retry after cooldown.`,
      source: provider.name,
      fetchedAt: new Date().toISOString(),
      latencyMs: 0,
    }
  }

  return collectWithRetry<T>(provider, params, opts)
}

// ─── Normalize & Validate ────────────────────────────────────────────────────

/**
 * Run a batch of raw records through a provider's validate → normalize → deduplicate pipeline.
 */
export function processRawRecords<TRaw, TNormalized>(
  provider: IDataProvider<TRaw, TNormalized>,
  rawRecords: TRaw[]
): {
  normalized: TNormalized[]
  validationErrors: Array<{ index: number; errors: ValidationResult }>
  deduplicated: TNormalized[]
  stats: { total: number; valid: number; invalid: number; deduped: number }
} {
  const validationErrors: Array<{ index: number; errors: ValidationResult }> = []
  const validRecords: TRaw[] = []

  // Validate
  for (let i = 0; i < rawRecords.length; i++) {
    const result = provider.validate(rawRecords[i])
    if (result.isValid) {
      validRecords.push(rawRecords[i])
    } else {
      validationErrors.push({ index: i, errors: result })
    }
  }

  // Normalize
  const normalized = validRecords.map(r => provider.normalize(r))

  // Deduplicate
  const deduplicated = provider.deduplicate(normalized)

  return {
    normalized,
    validationErrors,
    deduplicated,
    stats: {
      total: rawRecords.length,
      valid: validRecords.length,
      invalid: validationErrors.length,
      deduped: normalized.length - deduplicated.length,
    },
  }
}

// ─── Health Aggregation ──────────────────────────────────────────────────────

/**
 * Get aggregate health across all providers.
 */
export function getAggregateHealth(): {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  healthyCount: number
  degradedCount: number
  unhealthyCount: number
  offlineCount: number
  circuitsBroken: number
} {
  const providers = getProviders()
  let healthy = 0, degraded = 0, unhealthy = 0, offline = 0

  for (const p of providers) {
    const h = p.getHealth()
    switch (h.status) {
      case 'HEALTHY': healthy++; break
      case 'DEGRADED': degraded++; break
      case 'UNHEALTHY': unhealthy++; break
      case 'OFFLINE': offline++; break
    }
  }

  const broken = [...circuitStates.values()].filter(s => s.isOpen).length
  const total = providers.length

  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY'
  if (unhealthy + offline > 0) overallStatus = 'DEGRADED'
  if (healthy === 0 && total > 0) overallStatus = 'UNHEALTHY'

  return {
    overallStatus,
    healthyCount: healthy,
    degradedCount: degraded,
    unhealthyCount: unhealthy,
    offlineCount: offline,
    circuitsBroken: broken,
  }
}

// ─── Internal: Retry with Backoff ────────────────────────────────────────────

async function collectWithRetry<T>(
  provider: IDataProvider,
  params: CollectionParams,
  opts: Required<CollectOptions>
): Promise<ProviderCollectionResult<T>> {
  let lastError: string | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await withTimeout(
        provider.collect(params) as Promise<ProviderCollectionResult<T>>,
        opts.timeoutMs
      )

      if (result.success) {
        recordSuccess(provider.name)
        return result
      }

      lastError = result.error
    } catch (err: any) {
      lastError = err?.message ?? 'Collection failed'
    }

    // Exponential backoff before retry
    if (attempt < opts.maxRetries) {
      const delay = opts.retryBaseDelayMs * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  // All retries exhausted
  recordFailure(provider.name)

  return {
    success: false,
    data: [],
    error: lastError ?? `Provider "${provider.name}" failed after ${opts.maxRetries + 1} attempts`,
    source: provider.name,
    fetchedAt: new Date().toISOString(),
    latencyMs: 0,
  }
}

// ─── Internal: Circuit Breaker ───────────────────────────────────────────────

function isCircuitOpen(providerName: string): boolean {
  const state = circuitStates.get(providerName)
  if (!state?.isOpen) return false

  // Check if enough time has passed to allow a retry
  const elapsed = Date.now() - (state.openedAt ?? 0)
  if (elapsed >= CIRCUIT_RESET_MS) {
    // Half-open: allow one request through
    state.isOpen = false
    state.failures = 0
    return false
  }

  return true
}

function recordSuccess(providerName: string): void {
  const state = circuitStates.get(providerName)
  if (state) {
    state.failures = 0
    state.isOpen = false
  }
}

function recordFailure(providerName: string): void {
  let state = circuitStates.get(providerName)
  if (!state) {
    state = { failures: 0, lastFailureAt: 0, isOpen: false }
    circuitStates.set(providerName, state)
  }

  state.failures++
  state.lastFailureAt = Date.now()

  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.isOpen = true
    state.openedAt = Date.now()
  }
}

// ─── Internal: Utilities ─────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
