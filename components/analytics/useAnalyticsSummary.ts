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
  updatedAt: string
}

const FALLBACK: AnalyticsSummaryData = {
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

export function useAnalyticsSummary(refreshMs = 0): {
  data: AnalyticsSummaryData
  loading: boolean
} {
  const [data, setData] = useState<AnalyticsSummaryData>(FALLBACK)
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
        // Keep existing data (fallback)
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
