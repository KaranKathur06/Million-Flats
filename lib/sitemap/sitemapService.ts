/**
 * ============================================================================
 * SITEMAP SERVICE — Production-Grade SEO Indexing Engine
 * ============================================================================
 *
 * Core service for generating, caching, and serving XML sitemaps.
 *
 * Architecture:
 *   Database → SitemapService (aggregation) → File Cache → Public Endpoint
 *
 * Features:
 *   - Multi-sitemap strategy (index + per-type sitemaps)
 *   - File-based caching with 24-hour TTL
 *   - Fallback to last valid sitemap on failure
 *   - URL validation (no nulls, no duplicates, no drafts)
 *   - Extensible for image/video/hreflang sitemaps
 * ============================================================================
 */

import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export interface SitemapGenerationResult {
  success: boolean
  totalUrls: number
  sitemaps: {
    type: string
    urlCount: number
  }[]
  errors: SitemapError[]
  generatedAt: string
  durationMs: number
}

export interface SitemapError {
  type: string
  message: string
  url?: string
  timestamp: string
}

interface CachedSitemap {
  xml: string
  generatedAt: string
  urlCount: number
}

// ─── Constants ──────────────────────────────────────────────────────────────
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://millionflats.com').replace(/\/$/, '')
const CACHE_DIR = path.join(process.cwd(), '.sitemap-cache')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_URLS_PER_SITEMAP = 50000 // Google's limit

// ─── Static Pages ───────────────────────────────────────────────────────────
const STATIC_PAGES: SitemapUrl[] = [
  { loc: '/', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 1.0 },
  { loc: '/about', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.8 },
  { loc: '/contact', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.7 },
  { loc: '/projects', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/blogs', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.8 },
  { loc: '/buy', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/rent', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/sell', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/agents', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/developers', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/services', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.6 },
  { loc: '/privacy', lastmod: new Date().toISOString().split('T')[0], changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', lastmod: new Date().toISOString().split('T')[0], changefreq: 'yearly', priority: 0.3 },
  { loc: '/ecosystem', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.6 },
  { loc: '/market-analysis', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/featured-listings', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.8 },
]

// ─── Cache Helpers ──────────────────────────────────────────────────────────
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function getCachePath(type: string): string {
  return path.join(CACHE_DIR, `sitemap-${type}.xml`)
}

function getMetaPath(): string {
  return path.join(CACHE_DIR, 'sitemap-meta.json')
}

function isCacheValid(type: string): boolean {
  try {
    const cachePath = getCachePath(type)
    if (!fs.existsSync(cachePath)) return false
    const stat = fs.statSync(cachePath)
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS
  } catch {
    return false
  }
}

function readCache(type: string): string | null {
  try {
    const cachePath = getCachePath(type)
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8')
    }
  } catch (err) {
    console.error(`[Sitemap] Cache read error for ${type}:`, err)
  }
  return null
}

function writeCache(type: string, xml: string): void {
  try {
    ensureCacheDir()
    fs.writeFileSync(getCachePath(type), xml, 'utf-8')
  } catch (err) {
    console.error(`[Sitemap] Cache write error for ${type}:`, err)
  }
}

function writeMeta(result: SitemapGenerationResult): void {
  try {
    ensureCacheDir()
    fs.writeFileSync(getMetaPath(), JSON.stringify(result, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Sitemap] Meta write error:', err)
  }
}

export function readMeta(): SitemapGenerationResult | null {
  try {
    const metaPath = getMetaPath()
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    }
  } catch {
    return null
  }
  return null
}

// ─── XML Generation ─────────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateUrlsetXml(urls: SitemapUrl[]): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(BASE_URL + u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority.toFixed(1)}</priority>\n  </url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n${entries}\n</urlset>`
}

function generateSitemapIndexXml(sitemapTypes: string[], generatedAt: string): string {
  const entries = sitemapTypes
    .map(
      (type) =>
        `  <sitemap>\n    <loc>${escapeXml(BASE_URL + `/sitemap-${type}.xml`)}</loc>\n    <lastmod>${generatedAt}</lastmod>\n  </sitemap>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────
async function fetchProjectUrls(): Promise<SitemapUrl[]> {
  try {
    const projects = await (prisma as any).project.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    return projects
      .filter((p: any) => p.slug && typeof p.slug === 'string' && p.slug.trim() !== '')
      .map((p: any) => ({
        loc: `/projects/${p.slug}`,
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.8,
      }))
  } catch (err) {
    console.error('[Sitemap] Error fetching project URLs:', err)
    return []
  }
}

async function fetchBlogUrls(): Promise<SitemapUrl[]> {
  try {
    const blogs = await (prisma as any).blog.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    return blogs
      .filter((b: any) => b.slug && typeof b.slug === 'string' && b.slug.trim() !== '')
      .map((b: any) => ({
        loc: `/blogs/${b.slug}`,
        lastmod: b.updatedAt ? new Date(b.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.7,
      }))
  } catch (err) {
    console.error('[Sitemap] Error fetching blog URLs:', err)
    return []
  }
}

async function fetchDeveloperUrls(): Promise<SitemapUrl[]> {
  try {
    const developers = await (prisma as any).developer.findMany({
      where: {
        status: 'ACTIVE',
        isDeleted: false,
        slug: { not: null },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    return developers
      .filter((d: any) => d.slug && typeof d.slug === 'string' && d.slug.trim() !== '')
      .map((d: any) => ({
        loc: `/developers/${d.slug}`,
        lastmod: d.updatedAt ? new Date(d.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'monthly' as const,
        priority: 0.6,
      }))
  } catch (err) {
    console.error('[Sitemap] Error fetching developer URLs:', err)
    return []
  }
}

// ─── Deduplication ──────────────────────────────────────────────────────────
function deduplicateUrls(urls: SitemapUrl[]): SitemapUrl[] {
  const seen = new Set<string>()
  return urls.filter((u) => {
    const normalized = u.loc.toLowerCase().replace(/\/+$/, '')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

// ─── Main Generation Pipeline ───────────────────────────────────────────────
export async function generateAllSitemaps(): Promise<SitemapGenerationResult> {
  const startTime = Date.now()
  const errors: SitemapError[] = []
  const generatedAt = new Date().toISOString().split('T')[0]

  console.log('[Sitemap] Starting full sitemap generation...')

  // Fetch all URL sets in parallel
  const [projectUrls, blogUrls, developerUrls] = await Promise.all([
    fetchProjectUrls().catch((err) => {
      errors.push({ type: 'projects', message: String(err), timestamp: new Date().toISOString() })
      return [] as SitemapUrl[]
    }),
    fetchBlogUrls().catch((err) => {
      errors.push({ type: 'blogs', message: String(err), timestamp: new Date().toISOString() })
      return [] as SitemapUrl[]
    }),
    fetchDeveloperUrls().catch((err) => {
      errors.push({ type: 'developers', message: String(err), timestamp: new Date().toISOString() })
      return [] as SitemapUrl[]
    }),
  ])

  // Static pages
  const staticUrls = deduplicateUrls(STATIC_PAGES)

  // Deduplicate per type
  const dedupedProjects = deduplicateUrls(projectUrls)
  const dedupedBlogs = deduplicateUrls(blogUrls)
  const dedupedDevelopers = deduplicateUrls(developerUrls)

  // Generate XML for each type
  const sitemapTypes: { type: string; urls: SitemapUrl[] }[] = [
    { type: 'pages', urls: staticUrls },
    { type: 'projects', urls: dedupedProjects },
    { type: 'blogs', urls: dedupedBlogs },
    { type: 'developers', urls: dedupedDevelopers },
  ]

  const sitemapResults: { type: string; urlCount: number }[] = []
  const activeSitemapTypes: string[] = []

  for (const { type, urls } of sitemapTypes) {
    if (urls.length === 0) {
      console.log(`[Sitemap] Skipping ${type} — no URLs`)
      continue
    }

    const xml = generateUrlsetXml(urls)
    writeCache(type, xml)
    activeSitemapTypes.push(type)
    sitemapResults.push({ type, urlCount: urls.length })

    console.log(`[Sitemap] Generated sitemap-${type}.xml with ${urls.length} URLs`)
  }

  // Generate sitemap index
  const indexXml = generateSitemapIndexXml(activeSitemapTypes, generatedAt)
  writeCache('index', indexXml)

  const totalUrls = sitemapResults.reduce((sum, s) => sum + s.urlCount, 0)
  const durationMs = Date.now() - startTime

  const result: SitemapGenerationResult = {
    success: errors.length === 0,
    totalUrls,
    sitemaps: sitemapResults,
    errors,
    generatedAt: new Date().toISOString(),
    durationMs,
  }

  writeMeta(result)

  console.log(`[Sitemap] Generation complete: ${totalUrls} URLs across ${activeSitemapTypes.length} sitemaps in ${durationMs}ms`)

  return result
}

// ─── Serve Sitemap (cached with fallback) ───────────────────────────────────
export async function getSitemapXml(type: string): Promise<string | null> {
  // 1. Try serving from valid cache
  if (isCacheValid(type)) {
    const cached = readCache(type)
    if (cached) return cached
  }

  // 2. Cache expired or missing — try regenerating
  try {
    await generateAllSitemaps()
    const fresh = readCache(type)
    if (fresh) return fresh
  } catch (err) {
    console.error('[Sitemap] Regeneration failed, attempting fallback:', err)
  }

  // 3. Fallback — serve stale cache (better than nothing)
  const stale = readCache(type)
  if (stale) {
    console.warn(`[Sitemap] Serving stale cache for ${type}`)
    return stale
  }

  return null
}

// ─── Admin Dashboard Data ───────────────────────────────────────────────────
export interface SitemapDashboardData {
  totalUrls: number
  lastGenerated: string | null
  sitemaps: { type: string; urlCount: number }[]
  errors: SitemapError[]
  cacheStatus: { type: string; valid: boolean; size: number }[]
  generationDurationMs: number
}

export async function getSitemapDashboardData(): Promise<SitemapDashboardData> {
  const meta = readMeta()

  const cacheTypes = ['index', 'pages', 'projects', 'blogs', 'developers']
  const cacheStatus = cacheTypes.map((type) => {
    const cachePath = getCachePath(type)
    let valid = false
    let size = 0
    try {
      if (fs.existsSync(cachePath)) {
        const stat = fs.statSync(cachePath)
        valid = Date.now() - stat.mtimeMs < CACHE_TTL_MS
        size = stat.size
      }
    } catch {}
    return { type, valid, size }
  })

  return {
    totalUrls: meta?.totalUrls ?? 0,
    lastGenerated: meta?.generatedAt ?? null,
    sitemaps: meta?.sitemaps ?? [],
    errors: meta?.errors ?? [],
    cacheStatus,
    generationDurationMs: meta?.durationMs ?? 0,
  }
}
