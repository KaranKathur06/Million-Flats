'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Hook: fetches analytics summary from the API.
 * Re-fetches on mount and optionally on an interval.
 */
export interface AnalyticsSummaryData {
  monthlyVisitors: number
  realtimeUsers: number
  countries: number
  blogs: number
  cities: number
  developers: number
  tours: number
  agents: number
  buyProperties: number
  rentProperties: number
  totalProjects: number
  ecosystemPartners: number
  updatedAt: string
}

const EMPTY_SUMMARY: AnalyticsSummaryData = {
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

export function useAnalyticsSummary(refreshMs = 0): {
  data: AnalyticsSummaryData
  loading: boolean
} {
  const [data, setData] = useState<AnalyticsSummaryData>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/summary')
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch {
        // Keep the last successful response. Do not replace it with editorial counts.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchData()

    if (refreshMs > 0) {
      intervalRef.current = setInterval(fetchData, refreshMs)
    }

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refreshMs])

  return { data, loading }
}
