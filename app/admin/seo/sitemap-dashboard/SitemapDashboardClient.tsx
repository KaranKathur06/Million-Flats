'use client'

import { useState, useEffect, useCallback } from 'react'

interface SitemapEntry {
  type: string
  urlCount: number
}

interface SitemapError {
  type: string
  message: string
  url?: string
  timestamp: string
}

interface CacheEntry {
  type: string
  valid: boolean
  size: number
}

interface DashboardData {
  totalUrls: number
  lastGenerated: string | null
  sitemaps: SitemapEntry[]
  errors: SitemapError[]
  cacheStatus: CacheEntry[]
  generationDurationMs: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SitemapDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regenResult, setRegenResult] = useState<any | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/sitemap/status')
      if (!res.ok) throw new Error('Failed to fetch sitemap status')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handleRegenerate() {
    setRegenerating(true)
    setRegenResult(null)
    try {
      const res = await fetch('/api/system/sitemap/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Regeneration failed')
      setRegenResult(json)
      await fetchStatus()
    } catch (err: any) {
      setRegenResult({ error: err.message })
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="text-[13px] text-white/40">Loading sitemap data...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-6 text-center">
        <p className="text-rose-300 text-[14px] font-medium">Failed to load sitemap status</p>
        <p className="text-rose-300/60 text-[12px] mt-1">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[12px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-emerald-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              SEO
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Sitemap Dashboard</h1>
          <p className="mt-1 text-[13px] text-white/45">
            Monitor sitemap generation, cache health, and SEO indexing status.
          </p>
        </div>

        <button
          id="btn-regenerate-sitemap"
          onClick={handleRegenerate}
          disabled={regenerating}
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
            regenerating
              ? 'bg-white/[0.04] text-white/30 cursor-not-allowed border border-white/[0.06]'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400'
          }`}
        >
          {regenerating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0b1220]/20 border-t-[#0b1220]" />
              Regenerating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Now
            </>
          )}
        </button>
      </div>

      {/* Regen result toast */}
      {regenResult && (
        <div className={`rounded-xl border p-4 text-[13px] ${
          regenResult.error
            ? 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300'
            : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
        }`}>
          {regenResult.error ? (
            <p>❌ Regeneration failed: {regenResult.error}</p>
          ) : (
            <p>✅ Sitemap regenerated — {regenResult.totalUrls} URLs across {regenResult.sitemaps?.length || 0} sitemaps in {regenResult.durationMs}ms</p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total URLs</p>
          <p className="mt-2 text-3xl font-bold text-blue-300">{data?.totalUrls ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Last Generated</p>
          <p className="mt-2 text-lg font-bold text-emerald-300">
            {data?.lastGenerated ? timeAgo(data.lastGenerated) : 'Never'}
          </p>
          {data?.lastGenerated && (
            <p className="mt-1 text-[11px] text-white/30">
              {new Date(data.lastGenerated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] to-amber-600/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Sitemaps</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{data?.sitemaps?.length ?? 0}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${
          (data?.errors?.length ?? 0) > 0
            ? 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.12] to-rose-600/[0.04]'
            : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.02]'
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Errors</p>
          <p className={`mt-2 text-3xl font-bold ${(data?.errors?.length ?? 0) > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
            {data?.errors?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Sitemap Breakdown */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">Sitemap Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-white/30">Type</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-white/30">URLs</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-white/30">Cache</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-white/30">File Size</th>
                <th className="text-left py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-white/30">Public URL</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sitemaps || []).map((s) => {
                const cache = data?.cacheStatus?.find((c) => c.type === s.type)
                return (
                  <tr key={s.type} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="font-medium text-white/80 capitalize">{s.type}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/60 font-mono">{s.urlCount}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wider ${
                        cache?.valid
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-rose-400/10 text-rose-400'
                      }`}>
                        {cache?.valid ? 'Valid' : 'Expired'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-white/50 text-[12px]">
                      {cache ? formatBytes(cache.size) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`/sitemap-${s.type}.xml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400/70 hover:text-amber-300 text-[12px] font-medium transition-colors"
                      >
                        /sitemap-{s.type}.xml ↗
                      </a>
                    </td>
                  </tr>
                )
              })}
              {(!data?.sitemaps || data.sitemaps.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/30 text-[13px]">
                    No sitemaps generated yet. Click "Regenerate Now" to create them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cache Status */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">Cache Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(data?.cacheStatus || []).map((c) => (
            <div
              key={c.type}
              className={`rounded-xl border p-4 transition-all ${
                c.valid
                  ? 'border-emerald-500/15 bg-emerald-500/[0.04]'
                  : c.size > 0
                    ? 'border-amber-500/15 bg-amber-500/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 capitalize">{c.type}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  c.valid ? 'bg-emerald-400' : c.size > 0 ? 'bg-amber-400' : 'bg-white/20'
                }`} />
                <span className={`text-[12px] font-semibold ${
                  c.valid ? 'text-emerald-300' : c.size > 0 ? 'text-amber-300' : 'text-white/30'
                }`}>
                  {c.valid ? 'Fresh' : c.size > 0 ? 'Stale' : 'Empty'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-white/25 font-mono">
                {c.size > 0 ? formatBytes(c.size) : 'No file'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Errors */}
      {(data?.errors?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-rose-300/60 mb-4">Generation Errors</h2>
          <div className="space-y-2">
            {data?.errors?.map((e, i) => (
              <div key={i} className="rounded-xl border border-rose-500/10 bg-rose-500/[0.04] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-rose-300 capitalize">{e.type}</p>
                    <p className="mt-1 text-[12px] text-rose-300/60">{e.message}</p>
                    {e.url && <p className="mt-1 text-[11px] text-rose-300/40 font-mono">{e.url}</p>}
                  </div>
                  <span className="text-[10px] text-rose-300/30 whitespace-nowrap ml-4">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-2.5">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            /sitemap.xml
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            /robots.txt
          </a>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Google Search Console ↗
          </a>
        </div>
      </div>

      {/* Performance */}
      {data?.generationDurationMs ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] text-white/30">
            Last generation completed in <span className="font-mono text-white/50">{data.generationDurationMs}ms</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
