// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAIValuation — React hook for AIShield valuation data
// Usage: const { data, loading, error, refresh } = useAIValuation(entityId, entityType)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ValuationReport } from '@/lib/ai-core/types'

type EntityType = 'MANUAL_PROPERTY' | 'PROJECT'

interface UseAIValuationResult {
  data: ValuationReport | null
  loading: boolean
  error: string | null
  refresh: () => void
  cacheHit: boolean
}

export function useAIValuation(
  entityId: string | null | undefined,
  entityType: EntityType = 'MANUAL_PROPERTY',
  opts: { autoFetch?: boolean } = {}
): UseAIValuationResult {
  const { autoFetch = true } = opts
  const [data, setData] = useState<ValuationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheHit, setCacheHit] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(
    async (forceRefresh = false) => {
      if (!entityId) return
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/ai/valuation?entityId=${entityId}&entityType=${entityType}${forceRefresh ? '&forceRefresh=true' : ''}`,
          { signal: abortRef.current.signal }
        )
        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.error ?? 'Valuation unavailable')
          return
        }

        setData(json.data)
        setCacheHit(json.data?.cacheHit ?? false)
      } catch (err: any) {
        if (err.name !== 'AbortError') setError('Failed to load valuation')
      } finally {
        setLoading(false)
      }
    },
    [entityId, entityType]
  )

  useEffect(() => {
    if (autoFetch) fetch_()
    return () => abortRef.current?.abort()
  }, [fetch_, autoFetch])

  return { data, loading, error, refresh: () => fetch_(true), cacheHit }
}
