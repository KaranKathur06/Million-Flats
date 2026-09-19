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

/* ── Empty summary when analytics data is unavailable ───── */
const FALLBACK_SUMMARY: AnalyticsSummary = {
  monthlyVisitors: 0,
  realtimeUsers: 0,
  countries: 0,
  blogs: 0,
  cities: 0,
  developers: 0,
  tours: 0,
  agents: 0,
  buyProperties: 0,
  rentProperties: 0,
  totalProjects: 0,
  ecosystemPartners: 0,
  updatedAt: new Date().toISOString(),
}

export function buildAnalyticsSummary(input: Partial<AnalyticsSummary> & {
  monthlyVisitors: number
  realtimeUsers: number
  countries: number
  cities: number
  blogs: number
  developers: number
  tours?: number
  agents: number
  buyProperties?: number
  saleProperties?: number
  rentProperties: number
  totalProjects?: number
  ecosystemPartners?: number
  updatedAt: string
}): AnalyticsSummary {
  const buyProperties = input.buyProperties ?? input.saleProperties ?? 0

  return {
    monthlyVisitors: input.monthlyVisitors || 0,
    realtimeUsers: input.realtimeUsers || 0,
    countries: input.countries || 0,
    blogs: input.blogs || 0,
    cities: input.cities || 0,
    developers: input.developers || 0,
    tours: input.tours || 0,
    agents: input.agents || 0,
    buyProperties,
    rentProperties: input.rentProperties || 0,
    totalProjects: input.totalProjects || 0,
    ecosystemPartners: input.ecosystemPartners || 0,
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
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
            : 0

      return {
        monthlyVisitors: ga.monthlyVisitors,
        realtimeUsers: ga.realtimeUsers,
        countries: ga.countries,
        blogs: db.totalBlogs,
        cities: safeCities,
        developers: db.totalDevelopers,
        tours: db.total3DTours,
        agents: db.totalAgents,
        buyProperties: db.totalSaleProperties,
        rentProperties: db.totalRentProperties,
        totalProjects: db.totalProjects,
        ecosystemPartners: db.totalPartners,
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
