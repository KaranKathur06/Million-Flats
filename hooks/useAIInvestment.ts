// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAIInvestment — React hook for AIIndex investment intelligence
// Usage: const { data, loading, error } = useAIInvestment(entityId, entityType)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvestmentIntelligence } from '@/lib/ai-core/types'

type EntityType = 'MANUAL_PROPERTY' | 'PROJECT'

interface UseAIInvestmentResult {
  data: InvestmentIntelligence | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useAIInvestment(
  entityId: string | null | undefined,
  entityType: EntityType = 'MANUAL_PROPERTY'
): UseAIInvestmentResult {
  const [data, setData] = useState<InvestmentIntelligence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
          `/api/ai/investment?entityId=${entityId}&entityType=${entityType}${forceRefresh ? '&forceRefresh=true' : ''}`,
          { signal: abortRef.current.signal }
        )
        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.error ?? 'Investment report unavailable')
          return
        }

        setData(json.data)
      } catch (err: any) {
        if (err.name !== 'AbortError') setError('Failed to load investment report')
      } finally {
        setLoading(false)
      }
    },
    [entityId, entityType]
  )

  useEffect(() => {
    fetch_()
    return () => abortRef.current?.abort()
  }, [fetch_])

  return { data, loading, error, refresh: () => fetch_(true) }
}
