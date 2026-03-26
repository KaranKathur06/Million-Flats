/**
 * Analytics Trust Engine — In-Memory TTL Cache
 *
 * Thread-safe, stale-while-revalidate cache with per-key TTLs.
 * If the source API fails, the last known good value is returned.
 *
 * TTL Strategy:
 *  • realtimeUsers    → 30 s
 *  • monthlyVisitors  → 6 h
 *  • countries        → 12 h
 *  • blogs / DB data  → 1 h
 *  • summary (full)   → 2 min (fast path)
 */

import type { CacheEntry } from './types'

/* ── TTL constants (milliseconds) ───────────────────────── */
export const TTL = {
  REALTIME:  30 * 1_000,           // 30 seconds
  SUMMARY:   2 * 60 * 1_000,      // 2 minutes (fast‑path)
  BLOG:      1 * 60 * 60 * 1_000, // 1 hour
  DB:        1 * 60 * 60 * 1_000, // 1 hour
  MONTHLY:   6 * 60 * 60 * 1_000, // 6 hours
  COUNTRIES: 12 * 60 * 60 * 1_000, // 12 hours
} as const

/* ── Global in-memory store ─────────────────────────────── */
const store = new Map<string, CacheEntry<unknown>>()

/* ── Public API ─────────────────────────────────────────── */

/**
 * Get a cached value.  Returns `undefined` on miss.
 * When the entry is expired, returns the stale fallback if one exists.
 */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined

  if (Date.now() < entry.expiresAt) {
    return entry.data
  }

  // Expired → return stale fallback (if available)
  return entry.staleFallback ?? undefined
}

/**
 * Set a cache value with a given TTL (in ms).
 * Automatically preserves the previous value as `staleFallback`.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  const prev = store.get(key) as CacheEntry<T> | undefined
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    staleFallback: prev?.data ?? data,
  })
}

/**
 * Returns true if the cache entry is fresh (not expired).
 */
export function cacheIsFresh(key: string): boolean {
  const entry = store.get(key)
  return !!entry && Date.now() < entry.expiresAt
}

/**
 * Delete a cache entry.
 */
export function cacheDel(key: string): void {
  store.delete(key)
}

/**
 * Helper: wrap an async fetcher with cache.
 * - If fresh cache exists, return it immediately.
 * - Otherwise, call the fetcher, cache the result, and return it.
 * - If the fetcher throws and a stale fallback exists, return that.
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Fresh cache hit → instant return
  if (cacheIsFresh(key)) {
    return cacheGet<T>(key)!
  }

  // 2. Attempt fresh fetch
  try {
    const data = await fetcher()
    cacheSet(key, data, ttlMs)
    return data
  } catch (err) {
    // 3. Fallback to stale data
    const stale = cacheGet<T>(key)
    if (stale !== undefined) {
      console.warn(`[CacheService] Fetch failed for "${key}", returning stale data.`, err)
      return stale
    }
    throw err // No fallback at all → propagate
  }
}
