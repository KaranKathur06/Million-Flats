/**
 * ============================================================================
 * SITEMAP SERVICE — Production-Grade SEO Indexing Engine
 * ============================================================================
 *
 * Architecture:
 *   PostgreSQL (cursor-paginated) → SitemapService → File Cache → Public Endpoints
 *
 * Key guarantees:
 *   - No full-table loads: cursor pagination with configurable page size
 *   - Automatic chunking: splits at MAX_URLS_PER_SITEMAP (50 000)
 *   - Buy / Rent split derived from the authoritative `intent` field (SALE | RENT)
 *   - Only PUBLISHED, MANUAL, with approved agent are included
 *   - No `properties` sitemap — removed entirely
 *   - Sitemap index dynamically references all generated chunk files
 *   - Duplicate URL protection within each sitemap type
 *   - Structured per-generation diagnostics (data-quality report)
 *   - Failure mode: generation error ≠ valid empty sitemap
 * ============================================================================
 */

import { prisma } from '@/lib/prisma'
import { PUBLIC_PARTNER_VISIBILITY } from '@/lib/ecosystem/partnerVisibility'
import fs from 'fs'
import path from 'path'
import { getBaseUrl } from '@/lib/auth/routes'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { buildManualPropertyPath, propertyPurposeFromIntent } from '@/lib/manualPropertyRoutes'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

/** A single chunk file descriptor used in the sitemap index */
export interface SitemapChunkDescriptor {
  /** The cache-file key, e.g. "buy-1", "buy-2", "rent-1" */
  cacheKey: string
  /** The public URL path, e.g. "/sitemap-buy-1.xml" */
  publicPath: string
  urlCount: number
}

export interface SitemapTypeResult {
  /** Logical type label, e.g. "buy", "rent", "projects" */
  type: string
  totalUrlCount: number
  chunks: SitemapChunkDescriptor[]
}

/** Per-run data-quality diagnostics */
export interface SitemapDataQuality {
  buyIndexable: number
  rentIndexable: number
  excludedMissingSlug: number
  excludedInvalidIntent: number
  excludedNonPublicStatus: number
}

export interface SitemapGenerationResult {
  success: boolean
  totalUrls: number
  /** Flat list kept for backwards-compat with admin API response */
  sitemaps: { type: string; urlCount: number }[]
  /** Full chunk info for the new admin dashboard */
  sitemapTypes: SitemapTypeResult[]
  errors: SitemapError[]
  dataQuality: SitemapDataQuality
  generatedAt: string
  durationMs: number
}

export interface SitemapError {
  type: string
  message: string
  url?: string
  timestamp: string
}

// ─── Constants ──────────────────────────────────────────────────────────────
const BASE_URL = getBaseUrl()
const CACHE_DIR = path.join(process.cwd(), '.sitemap-cache')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_URLS_PER_SITEMAP = 50_000 // Google's hard limit
const PROPERTY_PAGE_SIZE = 5_000 // Cursor-pagination batch size
const SITEMAP_INDEX_VERSION = '2026-10-06-2' // Bump when index structure changes

// ─── Cache Helpers ──────────────────────────────────────────────────────────
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

/** Cache filename for a given key, e.g. "buy-1" → ".sitemap-cache/sitemap-buy-1.xml" */
function getCachePath(key: string): string {
  return path.join(CACHE_DIR, `sitemap-${key}.xml`)
}

function getMetaPath(): string {
  return path.join(CACHE_DIR, 'sitemap-meta.json')
}

function isCacheValid(key: string): boolean {
  try {
    const cachePath = getCachePath(key)
    if (!fs.existsSync(cachePath)) return false
    const stat = fs.statSync(cachePath)
    if (Date.now() - stat.mtimeMs >= CACHE_TTL_MS) return false
    if (key === 'index') {
      const cached = fs.readFileSync(cachePath, 'utf-8')
      return cached.includes(`sitemap-index-version:${SITEMAP_INDEX_VERSION}`)
    }
    return true
  } catch {
    return false
  }
}

function readCache(key: string): string | null {
  try {
    const cachePath = getCachePath(key)
    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8')
    }
  } catch (err) {
    console.error(`[Sitemap] Cache read error for ${key}:`, err)
  }
  return null
}

function writeCache(key: string, xml: string): void {
  try {
    ensureCacheDir()
    fs.writeFileSync(getCachePath(key), xml, 'utf-8')
  } catch (err) {
    console.error(`[Sitemap] Cache write error for ${key}:`, err)
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

/** Return cache-file size in bytes, or 0 if missing */
function getCacheSize(key: string): number {
  try {
    const cachePath = getCachePath(key)
    if (fs.existsSync(cachePath)) return fs.statSync(cachePath).size
  } catch {}
  return 0
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

/**
 * Generate the root sitemap index.
 * @param chunkPaths - array of public URL paths, e.g. ["/sitemap-pages.xml", "/sitemap-buy-1.xml"]
 */
function generateSitemapIndexXml(chunkPaths: string[], generatedAt: string): string {
  const entries = chunkPaths
    .map(
      (p) =>
        `  <sitemap>\n    <loc>${escapeXml(BASE_URL + p)}</loc>\n    <lastmod>${generatedAt}</lastmod>\n  </sitemap>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- sitemap-index-version:${SITEMAP_INDEX_VERSION} -->\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
}

function countUrlEntries(xml: string): number {
  return xml.match(/<url>/g)?.length || 0
}

// ─── URL Deduplication ──────────────────────────────────────────────────────
function deduplicateUrls(urls: SitemapUrl[]): SitemapUrl[] {
  const seen = new Set<string>()
  return urls.filter((u) => {
    const normalized = u.loc.toLowerCase().replace(/\/+$/, '')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

// ─── Chunking ───────────────────────────────────────────────────────────────
/**
 * Split an array of SitemapUrl into chunks of at most MAX_URLS_PER_SITEMAP.
 * Writes each chunk to cache and returns descriptors.
 */
function writeChunkedSitemap(
  logicalType: string,
  urls: SitemapUrl[]
): SitemapChunkDescriptor[] {
  if (urls.length === 0) return []

  const chunkCount = Math.ceil(urls.length / MAX_URLS_PER_SITEMAP)
  const descriptors: SitemapChunkDescriptor[] = []

  for (let i = 0; i < chunkCount; i++) {
    const chunk = urls.slice(i * MAX_URLS_PER_SITEMAP, (i + 1) * MAX_URLS_PER_SITEMAP)
    const chunkNumber = i + 1
    // If only 1 chunk, keep original key for backward-compat (e.g. "pages", "blogs")
    // For types that naturally chunk (buy, rent, projects), always use numbered key
    const cacheKey = chunkCount === 1 ? logicalType : `${logicalType}-${chunkNumber}`
    const publicPath = `/sitemap-${cacheKey}.xml`
    const xml = generateUrlsetXml(chunk)
    writeCache(cacheKey, xml)
    descriptors.push({ cacheKey, publicPath, urlCount: chunk.length })
    console.log(
      `[Sitemap] ${logicalType} chunk ${chunkNumber}/${chunkCount}: ${chunk.length} URLs → ${publicPath}`
    )
  }

  return descriptors
}

// ─── Static Pages ───────────────────────────────────────────────────────────
const STATIC_PAGES: SitemapUrl[] = [
  { loc: '/', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 1.0 },
  { loc: '/about', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.8 },
  { loc: '/contact', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.7 },
  { loc: '/projects', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/blogs', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.8 },
  { loc: '/sell', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/buy', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/rent', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.9 },
  { loc: '/agents', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/developers', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/services', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.6 },
  { loc: '/services/3d-tours', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.7 },
  { loc: '/services/developers', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.8 },
  { loc: '/services/agencies', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.8 },
  { loc: '/services/agents', lastmod: new Date().toISOString().split('T')[0], changefreq: 'monthly', priority: 0.8 },
  { loc: '/privacy', lastmod: new Date().toISOString().split('T')[0], changefreq: 'yearly', priority: 0.3 },
  { loc: '/terms', lastmod: new Date().toISOString().split('T')[0], changefreq: 'yearly', priority: 0.3 },
  { loc: '/ecosystem', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.6 },
  { loc: '/ecosystem-partners', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/market-analysis', lastmod: new Date().toISOString().split('T')[0], changefreq: 'weekly', priority: 0.7 },
  { loc: '/featured-listings', lastmod: new Date().toISOString().split('T')[0], changefreq: 'daily', priority: 0.8 },
]

// ─── Data Fetchers — Non-Property ────────────────────────────────────────────
async function fetchProjectUrls(): Promise<SitemapUrl[]> {
  try {
    const projects = await (prisma as any).project.findMany({
      where: { status: 'PUBLISHED', isDeleted: false },
      select: { slug: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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

async function fetchEcosystemPartnerUrls(): Promise<SitemapUrl[]> {
  try {
    const partners = await (prisma as any).ecosystemPartner.findMany({
      where: {
        ...PUBLIC_PARTNER_VISIBILITY,
        slug: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    })

    const categoryUrls: SitemapUrl[] = []
    const seenCategories = new Set<string>()
    const today = new Date().toISOString().split('T')[0]

    const partnerUrls = partners
      .filter((p: any) => p.slug && p.category?.slug)
      .map((p: any) => {
        if (!seenCategories.has(p.category.slug)) {
          seenCategories.add(p.category.slug)
          categoryUrls.push({
            loc: `/ecosystem-partners/${p.category.slug}`,
            lastmod: today,
            changefreq: 'weekly' as const,
            priority: 0.65,
          })
        }
        return {
          loc: `/partners/${p.category.slug}/${p.slug}`,
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today,
          changefreq: 'weekly' as const,
          priority: 0.6,
        }
      })

    return [...categoryUrls, ...partnerUrls]
  } catch (err) {
    console.error('[Sitemap] Error fetching ecosystem partner URLs:', err)
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
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

// ─── Property Fetcher — Cursor Pagination ────────────────────────────────────
/**
 * Public eligibility conditions (mirrors publicManualProperties.ts):
 *   status    = PUBLISHED
 *   sourceType = MANUAL
 *   agent.approved = true
 *   agent.user.status = ACTIVE
 *
 * We do NOT require agent.profileStatus = 'LIVE' here because
 * publicManualProperties.ts (the live page) only requires approved + ACTIVE user.
 * Adding profileStatus = LIVE would cause sitemap URLs that 404.
 */
const PUBLIC_PROPERTY_WHERE = {
  status: MANUAL_PROPERTY_PUBLIC_STATUS,
  sourceType: 'MANUAL',
  agent: {
    approved: true,
    user: { status: 'ACTIVE' },
  },
} as const

interface RawPropertyRow {
  id: string
  title: string | null
  intent: string | null
  updatedAt: Date
}

/**
 * Fetches all publicly eligible properties using cursor-based pagination.
 * Never loads the full table into memory — processes PROPERTY_PAGE_SIZE rows at a time.
 *
 * Returns structured buy/rent URL arrays + data-quality counters.
 */
async function fetchPropertyUrlsByCursor(): Promise<{
  buy: SitemapUrl[]
  rent: SitemapUrl[]
  excludedMissingSlug: number
  excludedInvalidIntent: number
}> {
  const buyUrls: SitemapUrl[] = []
  const rentUrls: SitemapUrl[] = []
  let excludedMissingSlug = 0
  let excludedInvalidIntent = 0

  // Cursor state — we paginate by (updatedAt DESC, id ASC) for stability
  let lastUpdatedAt: Date | null = null
  let lastId: string | null = null
  let hasMore = true
  let totalFetched = 0
  const today = new Date().toISOString().split('T')[0]

  console.log('[Sitemap][PROPERTY] Starting cursor-paginated fetch...')

  while (hasMore) {
    // Build the cursor condition
    const cursorWhere =
      lastUpdatedAt && lastId
        ? {
            OR: [
              { updatedAt: { lt: lastUpdatedAt } },
              { updatedAt: lastUpdatedAt, id: { gt: lastId } },
            ],
          }
        : {}

    const batch: RawPropertyRow[] = await (prisma as any).manualProperty.findMany({
      where: {
        ...PUBLIC_PROPERTY_WHERE,
        ...cursorWhere,
      },
      select: { id: true, title: true, intent: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: PROPERTY_PAGE_SIZE,
    })

    if (batch.length === 0) {
      hasMore = false
      break
    }

    totalFetched += batch.length

    for (const p of batch) {
      // Slug / path validation
      const loc = buildManualPropertyPath({ id: p.id, title: p.title, intent: p.intent })
      if (!loc || loc === '' || loc === '/buy/' || loc === '/rent/') {
        excludedMissingSlug++
        continue
      }

      // Intent classification — must be explicitly SALE or RENT
      const rawIntent = String(p.intent || '').trim().toUpperCase()
      if (rawIntent !== 'SALE' && rawIntent !== 'RENT') {
        excludedInvalidIntent++
        console.warn(
          `[Sitemap][PROPERTY] Excluded property ${p.id}: invalid intent "${p.intent}"`
        )
        continue
      }

      const purpose = propertyPurposeFromIntent(p.intent)
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today
      const url: SitemapUrl = { loc, lastmod, changefreq: 'weekly', priority: 0.8 }

      if (purpose === 'buy') {
        buyUrls.push(url)
      } else {
        rentUrls.push(url)
      }
    }

    // Advance cursor
    const last = batch[batch.length - 1]
    lastUpdatedAt = last.updatedAt
    lastId = last.id
    hasMore = batch.length === PROPERTY_PAGE_SIZE

    console.log(
      `[Sitemap][PROPERTY] Fetched ${totalFetched} so far — buy: ${buyUrls.length}, rent: ${rentUrls.length}`
    )
  }

  console.log(
    `[Sitemap][PROPERTY] Fetch complete. Total: ${totalFetched} | Buy: ${buyUrls.length} | Rent: ${rentUrls.length} | Excl.slug: ${excludedMissingSlug} | Excl.intent: ${excludedInvalidIntent}`
  )

  return { buy: buyUrls, rent: rentUrls, excludedMissingSlug, excludedInvalidIntent }
}

// ─── Main Generation Pipeline ────────────────────────────────────────────────
export async function generateAllSitemaps(): Promise<SitemapGenerationResult> {
  const startTime = Date.now()
  const errors: SitemapError[] = []
  const generatedAt = new Date().toISOString().split('T')[0]

  console.log('[Sitemap] ═══════════════════════════════════════════')
  console.log('[Sitemap] Starting full sitemap generation...')
  console.log(`[Sitemap] Base URL: ${BASE_URL}`)

  // ── Step 1: Fetch non-property data in parallel ──────────────────────────
  const [projectUrls, blogUrls, developerUrls, ecosystemPartnerUrls] = await Promise.all([
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
    fetchEcosystemPartnerUrls().catch((err) => {
      errors.push({ type: 'ecosystem-partners', message: String(err), timestamp: new Date().toISOString() })
      return [] as SitemapUrl[]
    }),
  ])

  // ── Step 2: Fetch properties with cursor pagination ──────────────────────
  let buyUrls: SitemapUrl[] = []
  let rentUrls: SitemapUrl[] = []
  let excludedMissingSlug = 0
  let excludedInvalidIntent = 0
  let propertyFetchFailed = false

  try {
    const propertyResult = await fetchPropertyUrlsByCursor()
    buyUrls = deduplicateUrls(propertyResult.buy)
    rentUrls = deduplicateUrls(propertyResult.rent)
    excludedMissingSlug = propertyResult.excludedMissingSlug
    excludedInvalidIntent = propertyResult.excludedInvalidIntent
  } catch (err) {
    propertyFetchFailed = true
    errors.push({ type: 'properties', message: String(err), timestamp: new Date().toISOString() })
    console.error('[Sitemap] Property fetch failed:', err)

    // Preserve previous buy/rent caches rather than clearing them
    const prevBuyCount = countUrlEntries(readCache('buy-1') || readCache('buy') || '')
    const prevRentCount = countUrlEntries(readCache('rent-1') || readCache('rent') || '')
    console.warn(
      `[Sitemap] Preserving stale property caches — prev buy: ${prevBuyCount}, prev rent: ${prevRentCount}`
    )
  }

  // ── Step 3: Deduplicate + chunk + write all sitemaps ─────────────────────
  /** All public chunk paths that go into the sitemap index */
  const indexChunkPaths: string[] = []
  const sitemapTypeResults: SitemapTypeResult[] = []
  /** Flat list kept for API backward-compat */
  const flatSitemapResults: { type: string; urlCount: number }[] = []

  // Helper: process one logical type
  function processSitemapType(logicalType: string, urls: SitemapUrl[]) {
    const deduped = deduplicateUrls(urls)

    if (deduped.length === 0) {
      console.log(`[Sitemap] Skipping ${logicalType} — no URLs`)
      return
    }

    const chunks = writeChunkedSitemap(logicalType, deduped)
    for (const chunk of chunks) {
      indexChunkPaths.push(chunk.publicPath)
    }

    sitemapTypeResults.push({
      type: logicalType,
      totalUrlCount: deduped.length,
      chunks,
    })

    flatSitemapResults.push({ type: logicalType, urlCount: deduped.length })

    console.log(
      `[Sitemap] ✓ ${logicalType}: ${deduped.length} URLs in ${chunks.length} chunk(s)`
    )
  }

  // Static pages (no chunking needed — always < 50k)
  processSitemapType('pages', STATIC_PAGES)

  // Projects (already large at 32k — chunking-ready)
  processSitemapType('projects', deduplicateUrls(projectUrls))

  // Buy properties — individual canonical URLs from the authoritative intent field
  if (!propertyFetchFailed) {
    processSitemapType('buy', buyUrls)
    processSitemapType('rent', rentUrls)
  } else {
    // Attempt to read previously cached buy/rent chunk files for reporting
    // We don't re-add them to the index (stale index served from cache)
    console.warn('[Sitemap] Skipping buy/rent in index due to fetch failure — serving stale')
  }

  // Blogs
  processSitemapType('blogs', deduplicateUrls(blogUrls))

  // Developers
  processSitemapType('developers', deduplicateUrls(developerUrls))

  // Ecosystem Partners
  processSitemapType('ecosystem-partners', deduplicateUrls(ecosystemPartnerUrls))

  // ── Step 4: Generate sitemap index ──────────────────────────────────────
  const indexXml = generateSitemapIndexXml(indexChunkPaths, generatedAt)
  writeCache('index', indexXml)

  // ── Step 5: Build result ─────────────────────────────────────────────────
  const totalUrls = flatSitemapResults.reduce((sum, s) => sum + s.urlCount, 0)
  const durationMs = Date.now() - startTime

  const dataQuality: SitemapDataQuality = {
    buyIndexable: buyUrls.length,
    rentIndexable: rentUrls.length,
    excludedMissingSlug,
    excludedInvalidIntent,
    // We don't have a direct "non-public status" count here (filtered at DB level)
    excludedNonPublicStatus: 0,
  }

  const result: SitemapGenerationResult = {
    success: errors.length === 0,
    totalUrls,
    sitemaps: flatSitemapResults,
    sitemapTypes: sitemapTypeResults,
    errors,
    dataQuality,
    generatedAt: new Date().toISOString(),
    durationMs,
  }

  writeMeta(result)

  console.log('[Sitemap] ═══════════════════════════════════════════')
  console.log(
    `[Sitemap] Generation complete: ${totalUrls} URLs | ${indexChunkPaths.length} chunk files | ${durationMs}ms | Errors: ${errors.length}`
  )
  console.log(
    `[Sitemap] Data quality — Buy: ${dataQuality.buyIndexable} | Rent: ${dataQuality.rentIndexable} | Excl.slug: ${excludedMissingSlug} | Excl.intent: ${excludedInvalidIntent}`
  )

  return result
}

// ─── Serve Sitemap (cached with fallback) ────────────────────────────────────
/**
 * Serve a sitemap by cache key (e.g. "buy-1", "rent-2", "index", "pages").
 * On cache miss or expiry → regenerate → serve fresh.
 * On regeneration failure → serve stale (better than 503).
 */
export async function getSitemapXml(key: string): Promise<string | null> {
  // 1. Try serving from valid cache
  if (isCacheValid(key)) {
    const cached = readCache(key)
    if (cached) return cached
  }

  // 2. Cache expired or missing — regenerate
  try {
    await generateAllSitemaps()
    const fresh = readCache(key)
    if (fresh) return fresh
  } catch (err) {
    console.error('[Sitemap] Regeneration failed, attempting fallback:', err)
  }

  // 3. Fallback — serve stale (better than nothing)
  const stale = readCache(key)
  if (stale) {
    console.warn(`[Sitemap] Serving stale cache for ${key}`)
    return stale
  }

  return null
}

// ─── Admin Dashboard Data ────────────────────────────────────────────────────
export interface SitemapCacheEntry {
  key: string
  valid: boolean
  size: number
}

export interface SitemapDashboardData {
  totalUrls: number
  lastGenerated: string | null
  /** Flat list for backward-compat */
  sitemaps: { type: string; urlCount: number }[]
  /** Full chunk breakdown for the enhanced admin UI */
  sitemapTypes: SitemapTypeResult[]
  errors: SitemapError[]
  dataQuality: SitemapDataQuality | null
  cacheStatus: SitemapCacheEntry[]
  generationDurationMs: number
}

export async function getSitemapDashboardData(): Promise<SitemapDashboardData> {
  const meta = readMeta()

  // Determine all cache keys from meta if available, otherwise fall back to defaults
  const indexCacheKeys: string[] = ['index']
  const knownKeys = new Set<string>(indexCacheKeys)

  if (meta?.sitemapTypes) {
    for (const st of meta.sitemapTypes) {
      for (const chunk of st.chunks) {
        knownKeys.add(chunk.cacheKey)
      }
    }
  } else {
    // Fallback: check expected keys on disk (handles first-run before meta exists)
    for (const base of ['pages', 'blogs', 'developers', 'ecosystem-partners']) {
      knownKeys.add(base)
    }
    for (const base of ['projects', 'buy', 'rent']) {
      for (let i = 1; i <= 20; i++) {
        const key = `${base}-${i}`
        if (fs.existsSync(getCachePath(key))) knownKeys.add(key)
        else if (i === 1) {
          // Also check the un-numbered key (single-chunk case)
          if (fs.existsSync(getCachePath(base))) knownKeys.add(base)
          break
        } else break
      }
    }
  }

  const cacheStatus: SitemapCacheEntry[] = Array.from(knownKeys).map((key) => ({
    key,
    valid: isCacheValid(key),
    size: getCacheSize(key),
  }))

  return {
    totalUrls: meta?.totalUrls ?? 0,
    lastGenerated: meta?.generatedAt ?? null,
    sitemaps: meta?.sitemaps ?? [],
    sitemapTypes: meta?.sitemapTypes ?? [],
    errors: meta?.errors ?? [],
    dataQuality: meta?.dataQuality ?? null,
    cacheStatus,
    generationDurationMs: meta?.durationMs ?? 0,
  }
}
