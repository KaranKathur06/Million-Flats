import type { CacheEntry } from './types'

export const TTL = {
  REALTIME: 30 * 1_000,
  SUMMARY: 2 * 60 * 1_000,
  BLOG: 1 * 60 * 60 * 1_000,
  DB: 1 * 60 * 60 * 1_000,
  MONTHLY: 6 * 60 * 60 * 1_000,
  COUNTRIES: 12 * 60 * 60 * 1_000,
} as const

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined

  if (Date.now() < entry.expiresAt) {
    console.log('[CacheService] CACHE HIT:', key)
    return entry.data
  }

  return entry.staleFallback ?? undefined
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  const prev = store.get(key) as CacheEntry<T> | undefined
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    staleFallback: prev?.data ?? data,
  })
}

export function cacheIsFresh(key: string): boolean {
  const entry = store.get(key)
  return !!entry && Date.now() < entry.expiresAt
}

export function cacheDel(key: string): void {
  store.delete(key)
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (cacheIsFresh(key)) {
    console.log('[CacheService] CACHE HIT:', key)
    return cacheGet<T>(key)!
  }

  try {
    const data = await fetcher()
    cacheSet(key, data, ttlMs)
    return data
  } catch (err) {
    const stale = cacheGet<T>(key)
    if (stale !== undefined) {
      console.warn(`[CacheService] Fetch failed for "${key}", returning stale data.`, err)
      return stale
    }
    throw err
  }
}
