/**
 * Analytics Trust Engine — Shared Types
 * Canonical type definitions for the entire analytics pipeline.
 */

/* ── GA4 Metrics ────────────────────────────────────────── */
export interface GAMetrics {
  monthlyVisitors: number
  realtimeUsers: number
  countries: number
}

/* ── Internal DB Metrics ────────────────────────────────── */
export interface DBMetrics {
  totalBlogs: number
  totalCities: number
  totalDevelopers: number
  total3DTours: number
  totalAgents: number
}

/* ── Combined Summary ───────────────────────────────────── */
export interface AnalyticsSummary {
  monthlyVisitors: number
  realtimeUsers: number
  countries: number
  blogs: number
  cities: number
  developers: number
  tours: number
  agents: number
  updatedAt: string           // ISO timestamp of last aggregation
}

/* ── Page-Level Metrics ─────────────────────────────────── */
export interface PageViewMetrics {
  path: string
  views: number
  countries: number
}

/* ── Cache entry ────────────────────────────────────────── */
export interface CacheEntry<T> {
  data: T
  expiresAt: number           // epoch ms
  staleFallback?: T           // last known good value
}
