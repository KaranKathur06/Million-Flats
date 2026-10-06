'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface SitemapChunk {
  cacheKey: string
  publicPath: string
  urlCount: number
}

interface SitemapTypeResult {
  type: string
  totalUrlCount: number
  chunks: SitemapChunk[]
}

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
  key: string
  valid: boolean
  size: number
}

interface DataQuality {
  buyIndexable: number
  rentIndexable: number
  excludedMissingSlug: number
  excludedInvalidIntent: number
  excludedNonPublicStatus: number
}

interface DashboardData {
  totalUrls: number
  lastGenerated: string | null
  sitemaps: SitemapEntry[]
  sitemapTypes: SitemapTypeResult[]
  errors: SitemapError[]
  dataQuality: DataQuality | null
  cacheStatus: CacheEntry[]
  generationDurationMs: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatNumber(n: number): string {
  return n.toLocaleString()
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

function typeLabelMap(type: string): string {
  const labels: Record<string, string> = {
    pages: 'Pages',
    projects: 'Projects',
    buy: 'Buy',
    rent: 'Rent',
    blogs: 'Blogs',
    developers: 'Developers',
    'ecosystem-partners': 'Ecosystem Partners',
  }
  return labels[type] ?? type.replace(/-/g, ' ')
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    buy: 'bg-emerald-400/10 text-emerald-400',
    rent: 'bg-sky-400/10 text-sky-400',
    projects: 'bg-violet-400/10 text-violet-400',
    pages: 'bg-slate-400/10 text-slate-300',
    blogs: 'bg-amber-400/10 text-amber-400',
    developers: 'bg-rose-400/10 text-rose-400',
    'ecosystem-partners': 'bg-teal-400/10 text-teal-400',
  }
  const cls = colors[type] ?? 'bg-white/10 text-white/60'
  return (
    <span className={`inline-flex h-5 items-center rounded-md px-2 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {typeLabelMap(type)}
    </span>
  )
}

interface SitemapTypeCardProps {
  st: SitemapTypeResult
  cacheStatus: CacheEntry[]
}

function SitemapTypeCard({ st, cacheStatus }: SitemapTypeCardProps) {
  const firstChunkCache = cacheStatus.find((c) => c.key === st.chunks[0]?.cacheKey)
  const allValid = st.chunks.every((ch) =>
    (cacheStatus.find((c) => c.key === ch.cacheKey)?.valid) === true
  )

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${allValid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <TypeBadge type={st.type} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70 font-mono text-[13px] font-semibold">
            {formatNumber(st.totalUrlCount)} URLs
          </span>
          {st.chunks.length > 1 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
              {st.chunks.length} files
            </span>
          )}
          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wider ${
              allValid ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
            }`}
          >
            {allValid ? 'Valid' : 'Stale'}
          </span>
        </div>
      </div>

      {/* Chunk list */}
      <div className="space-y-1.5">
        {st.chunks.map((ch) => {
          const cache = cacheStatus.find((c) => c.key === ch.cacheKey)
          return (
            <div key={ch.cacheKey} className="flex items-center justify-between text-[12px]">
              <a
                href={ch.publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-amber-400/70 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                {ch.publicPath}
                <svg className="h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <div className="flex items-center gap-2 text-white/40">
                <span className="font-mono">{formatNumber(ch.urlCount)} URLs</span>
                {cache && (
                  <span className="font-mono">{formatBytes(cache.size)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary size */}
      {firstChunkCache && (
        <p className="text-[11px] text-white/25 font-mono">
          {formatBytes(st.chunks.reduce((s, ch) => {
            const c = cacheStatus.find((cc) => cc.key === ch.cacheKey)
            return s + (c?.size ?? 0)
          }, 0))} total on disk
        </p>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
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

  // Determine which types to display (use sitemapTypes if available, else fall back to sitemaps)
  const displayTypes: SitemapTypeResult[] = data?.sitemapTypes?.length
    ? data.sitemapTypes
    : (data?.sitemaps ?? []).map((s) => ({
        type: s.type,
        totalUrlCount: s.urlCount,
        chunks: [
          {
            cacheKey: s.type,
            publicPath: `/sitemap-${s.type}.xml`,
            urlCount: s.urlCount,
          },
        ],
      }))

  const dq = data?.dataQuality

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

      {/* Regen result */}
      {regenResult && (
        <div className={`rounded-xl border p-4 text-[13px] ${
          regenResult.error
            ? 'border-rose-500/20 bg-rose-500/[0.06] text-rose-300'
            : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
        }`}>
          {regenResult.error ? (
            <p>❌ Regeneration failed: {regenResult.error}</p>
          ) : (
            <p>
              ✅ Sitemap regenerated — {formatNumber(regenResult.totalUrls)} URLs across{' '}
              {regenResult.sitemaps?.length || 0} types in {regenResult.durationMs}ms
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.04] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total URLs</p>
          <p className="mt-2 text-3xl font-bold text-blue-300">{formatNumber(data?.totalUrls ?? 0)}</p>
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Sitemap Types</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{displayTypes.length}</p>
          {displayTypes.length > 0 && (
            <p className="mt-1 text-[11px] text-white/30">
              {displayTypes.reduce((s, t) => s + t.chunks.length, 0)} chunk files total
            </p>
          )}
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
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">
          Sitemap Breakdown
        </h2>

        {displayTypes.length === 0 ? (
          <p className="py-8 text-center text-white/30 text-[13px]">
            No sitemaps generated yet. Click &ldquo;Regenerate Now&rdquo; to create them.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayTypes.map((st) => (
              <SitemapTypeCard
                key={st.type}
                st={st}
                cacheStatus={data?.cacheStatus ?? []}
              />
            ))}
          </div>
        )}
      </div>

      {/* Data Quality Report */}
      {dq && (dq.buyIndexable > 0 || dq.rentIndexable > 0 || dq.excludedMissingSlug > 0 || dq.excludedInvalidIntent > 0) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">
            Sitemap Data Quality
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Buy Indexable</p>
              <p className="mt-2 text-xl font-bold text-emerald-300">{formatNumber(dq.buyIndexable)}</p>
            </div>
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.04] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Rent Indexable</p>
              <p className="mt-2 text-xl font-bold text-sky-300">{formatNumber(dq.rentIndexable)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${dq.excludedMissingSlug > 0 ? 'border-amber-500/15 bg-amber-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Excl. Missing Slug</p>
              <p className={`mt-2 text-xl font-bold ${dq.excludedMissingSlug > 0 ? 'text-amber-300' : 'text-white/30'}`}>
                {formatNumber(dq.excludedMissingSlug)}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${dq.excludedInvalidIntent > 0 ? 'border-rose-500/15 bg-rose-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Excl. Invalid Intent</p>
              <p className={`mt-2 text-xl font-bold ${dq.excludedInvalidIntent > 0 ? 'text-rose-300' : 'text-white/30'}`}>
                {formatNumber(dq.excludedInvalidIntent)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Excl. Non-Public</p>
              <p className="mt-2 text-xl font-bold text-white/30">
                {formatNumber(dq.excludedNonPublicStatus)}
              </p>
              <p className="mt-1 text-[10px] text-white/20">filtered by DB</p>
            </div>
          </div>
        </div>
      )}

      {/* Cache Health */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40 mb-4">Cache Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(data?.cacheStatus || []).map((c) => (
            <div
              key={c.key}
              className={`rounded-xl border p-4 transition-all ${
                c.valid
                  ? 'border-emerald-500/15 bg-emerald-500/[0.04]'
                  : c.size > 0
                    ? 'border-amber-500/15 bg-amber-500/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono truncate">{c.key}</p>
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
          {[
            { href: '/sitemap.xml', label: '/sitemap.xml' },
            { href: '/sitemap-buy-1.xml', label: '/sitemap-buy-1.xml' },
            { href: '/sitemap-rent-1.xml', label: '/sitemap-rent-1.xml' },
            { href: '/sitemap-projects-1.xml', label: '/sitemap-projects-1.xml' },
            { href: '/robots.txt', label: '/robots.txt' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all font-mono"
            >
              {label} ↗
            </a>
          ))}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[12px] font-semibold text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15] transition-all"
          >
            Google Search Console ↗
          </a>
        </div>
      </div>

      {/* Performance */}
      {data?.generationDurationMs ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] text-white/30">
            Last generation completed in{' '}
            <span className="font-mono text-white/50">{data.generationDurationMs}ms</span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
