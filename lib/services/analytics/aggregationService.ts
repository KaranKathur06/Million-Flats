/**
 * Analytics Trust Engine — Aggregation Service (Core Logic)
 *
 * Orchestrates GA4 + DB metrics through the cache layer.
 * This is the single entry point consumed by the API route.
 */

import type { AnalyticsSummary } from './types'
import { cacheGet, cachedFetch, TTL } from './cacheService'
import { getAllGAMetrics, getRealtimeUsers } from './gaService'
import { getDBMetrics } from './dbMetricsService'

/* ── Cache keys ─────────────────────────────────────────── */
const KEY_SUMMARY  = 'analytics:summary'
const KEY_REALTIME = 'analytics:realtime'
const KEY_GA       = 'analytics:ga'
const KEY_DB       = 'analytics:db'

/* ── Default / fallback values ──────────────────────────── */
const FALLBACK_SUMMARY: AnalyticsSummary = {
  monthlyVisitors: 12_400,
  realtimeUsers: 45,
  countries: 22,
  blogs: 55,
  cities: 40,
  developers: 110,
  tours: 280,
  agents: 75,
  updatedAt: new Date().toISOString(),
}

/* ── Public API ─────────────────────────────────────────── */

/**
 * Get the full analytics summary.
 * Uses a 2-minute fast-path cache on the combined result,
 * with individual GA / DB caches underneath.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    return await cachedFetch<AnalyticsSummary>(KEY_SUMMARY, TTL.SUMMARY, async () => {
      const previous = cacheGet<AnalyticsSummary>(KEY_SUMMARY)

      // Fetch GA and DB in parallel
      const [ga, db] = await Promise.all([
        cachedFetch(KEY_GA, TTL.MONTHLY, getAllGAMetrics),
        cachedFetch(KEY_DB, TTL.DB, getDBMetrics),
      ])

      const safeCities =
        ga.cities > 0
          ? ga.cities
          : previous?.cities && previous.cities > 0
            ? previous.cities
            : FALLBACK_SUMMARY.cities

      return {
        monthlyVisitors: ga.monthlyVisitors,
        realtimeUsers: ga.realtimeUsers,
        countries: ga.countries,
        blogs: db.totalBlogs,
        cities: safeCities,
        developers: db.totalDevelopers,
        tours: db.total3DTours,
        agents: db.totalAgents,
        updatedAt: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('[AggregationService] getAnalyticsSummary failed, returning fallback:', err)
    return FALLBACK_SUMMARY
  }
}

/**
 * Get only the realtime user count (lighter, shorter TTL).
 */
export async function getRealtimeCount(): Promise<number> {
  try {
    return await cachedFetch<number>(KEY_REALTIME, TTL.REALTIME, getRealtimeUsers)
  } catch {
    return FALLBACK_SUMMARY.realtimeUsers
  }
}
