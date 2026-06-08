'use client'

/**
 * useSecureAsset — React hook for fetching signed URLs for protected assets
 * ─────────────────────────────────────────────────────────────────────────
 * Calls /api/assets/url to get a time-limited signed URL, caches it in
 * memory until near-expiry, and auto-refreshes before the URL expires.
 *
 * Usage:
 *   const { url, loading, error } = useSecureAsset(s3Key)
 *   const { url, loading, error } = useSecureAsset(s3Key, { context: 'download' })
 */

import { useState, useEffect, useCallback, useRef } from 'react'

type UseSecureAssetOptions = {
  /** Optional context hint ('download' | 'view'). Affects tracking. */
  context?: 'download' | 'view'
  /** If false, the hook will not fetch automatically. Default true. */
  enabled?: boolean
  /** Refresh the URL this many seconds before expiry. Default 60. */
  refreshBeforeExpirySec?: number
}

type UseSecureAssetResult = {
  /** The signed URL, or null if not yet loaded / error */
  url: string | null
  /** True while the initial fetch is in progress */
  loading: boolean
  /** Error message if the fetch failed */
  error: string | null
  /** Re-fetch a fresh signed URL */
  refresh: () => void
  /** GA4 event payload (if returned by the API) */
  ga4Event: Record<string, string | undefined> | null
}

// ─── In-memory URL cache ────────────────────────────────────────────────────

type CacheEntry = {
  url: string
  expiresAt: number
  ga4Event: Record<string, string | undefined> | null
}

const urlCache = new Map<string, CacheEntry>()

function getCachedUrl(s3Key: string): CacheEntry | null {
  const entry = urlCache.get(s3Key)
  if (!entry) return null
  // Expire 60 seconds early to avoid using an about-to-expire URL
  if (Date.now() > entry.expiresAt - 60_000) {
    urlCache.delete(s3Key)
    return null
  }
  return entry
}

// ─── Hook Implementation ────────────────────────────────────────────────────

export function useSecureAsset(
  s3Key: string | null | undefined,
  options?: UseSecureAssetOptions
): UseSecureAssetResult {
  const { context, enabled = true, refreshBeforeExpirySec = 60 } = options || {}

  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ga4Event, setGa4Event] = useState<Record<string, string | undefined> | null>(null)

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSignedUrl = useCallback(async () => {
    if (!s3Key || !enabled) return

    // Check cache first
    const cached = getCachedUrl(s3Key)
    if (cached) {
      setUrl(cached.url)
      setGa4Event(cached.ga4Event)
      setLoading(false)
      setError(null)
      return
    }

    // Cancel any in-flight request
    abortRef.current?.abort()
    const abortController = new AbortController()
    abortRef.current = abortController

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/assets/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: s3Key, context }),
        signal: abortController.signal,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        const message = data.message || `Failed to load asset (${res.status})`
        setError(message)
        setUrl(null)
        setLoading(false)
        return
      }

      const expiresAt = Date.now() + data.expiresIn * 1000

      // Cache the result
      urlCache.set(s3Key, {
        url: data.url,
        expiresAt,
        ga4Event: data.ga4Event || null,
      })

      setUrl(data.url)
      setGa4Event(data.ga4Event || null)
      setLoading(false)

      // Schedule auto-refresh before expiry
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      const refreshIn = Math.max(1000, (data.expiresIn - refreshBeforeExpirySec) * 1000)
      refreshTimerRef.current = setTimeout(() => {
        urlCache.delete(s3Key)
        fetchSignedUrl()
      }, refreshIn)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Network error')
      setUrl(null)
      setLoading(false)
    }
  }, [s3Key, context, enabled, refreshBeforeExpirySec])

  useEffect(() => {
    fetchSignedUrl()
    return () => {
      abortRef.current?.abort()
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [fetchSignedUrl])

  const refresh = useCallback(() => {
    if (s3Key) urlCache.delete(s3Key)
    fetchSignedUrl()
  }, [s3Key, fetchSignedUrl])

  return { url, loading, error, refresh, ga4Event }
}
