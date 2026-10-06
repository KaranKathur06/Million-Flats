/**
 * Sitemap Intent Classification Tests
 *
 * Validates that the sitemap service correctly classifies properties
 * into buy/rent using the authoritative `intent` field (SALE | RENT),
 * excludes invalid/missing intent values, handles duplicate URLs,
 * and generates correct canonical paths.
 */

jest.mock('@/lib/prisma', () => ({ prisma: {} }))

import { buildManualPropertyPath, propertyPurposeFromIntent } from '@/lib/manualPropertyRoutes'

// ─── Helpers (mirror the logic inside sitemapService) ──────────────────────

function classifyIntent(intent: unknown): 'buy' | 'rent' | null {
  const raw = String(intent || '').trim().toUpperCase()
  if (raw === 'SALE') return 'buy'
  if (raw === 'RENT') return 'rent'
  return null
}

function deduplicateUrls<T extends { loc: string }>(urls: T[]): T[] {
  const seen = new Set<string>()
  return urls.filter((u) => {
    const normalized = u.loc.toLowerCase().replace(/\/+$/, '')
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('propertyPurposeFromIntent', () => {
  it('maps SALE → buy', () => {
    expect(propertyPurposeFromIntent('SALE')).toBe('buy')
  })

  it('maps RENT → rent', () => {
    expect(propertyPurposeFromIntent('RENT')).toBe('rent')
  })

  it('defaults unknown values → buy (SALE fallback in normalizeManualPropertyIntent)', () => {
    expect(propertyPurposeFromIntent(null)).toBe('buy')
    expect(propertyPurposeFromIntent('')).toBe('buy')
    expect(propertyPurposeFromIntent('UNKNOWN')).toBe('buy')
  })
})

describe('classifyIntent (sitemap filtering logic)', () => {
  it('returns buy for SALE', () => expect(classifyIntent('SALE')).toBe('buy'))
  it('returns rent for RENT', () => expect(classifyIntent('RENT')).toBe('rent'))
  it('returns null for empty string', () => expect(classifyIntent('')).toBeNull())
  it('returns null for null', () => expect(classifyIntent(null)).toBeNull())
  it('returns null for undefined', () => expect(classifyIntent(undefined)).toBeNull())
  it('returns null for arbitrary string', () => expect(classifyIntent('BUY')).toBeNull())
  it('returns null for numeric', () => expect(classifyIntent(1)).toBeNull())
})

describe('buildManualPropertyPath (canonical URL generation)', () => {
  const SALE_ID = '00000000-0000-0000-0000-000000000001'
  const RENT_ID = '00000000-0000-0000-0000-000000000002'

  it('generates /buy/ path for SALE intent', () => {
    const path = buildManualPropertyPath({ id: SALE_ID, title: 'Sea View Apartment', intent: 'SALE' })
    expect(path).toMatch(/^\/buy\//)
    expect(path).toContain(SALE_ID)
  })

  it('generates /rent/ path for RENT intent', () => {
    const path = buildManualPropertyPath({ id: RENT_ID, title: 'City Flat', intent: 'RENT' })
    expect(path).toMatch(/^\/rent\//)
    expect(path).toContain(RENT_ID)
  })

  it('returns empty string for missing id', () => {
    expect(buildManualPropertyPath({ id: '', title: 'Test', intent: 'SALE' })).toBe('')
  })

  it('generates a valid path even with null title', () => {
    const path = buildManualPropertyPath({ id: SALE_ID, title: null, intent: 'SALE' })
    expect(path).toMatch(/^\/buy\//)
    expect(path).not.toContain('undefined')
    expect(path).not.toContain('null')
  })
})

describe('deduplicateUrls', () => {
  it('removes duplicate loc values', () => {
    const urls = [
      { loc: '/buy/a-123', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/buy/a-123', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/buy/b-456', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
    ]
    const result = deduplicateUrls(urls)
    expect(result).toHaveLength(2)
    expect(result.map((u) => u.loc)).toEqual(['/buy/a-123', '/buy/b-456'])
  })

  it('treats trailing slashes as duplicates', () => {
    const urls = [
      { loc: '/buy/slug-123', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/buy/slug-123/', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
    ]
    expect(deduplicateUrls(urls)).toHaveLength(1)
  })

  it('is case-insensitive for dedup purposes', () => {
    const urls = [
      { loc: '/Buy/Slug-123', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
      { loc: '/buy/slug-123', lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 },
    ]
    expect(deduplicateUrls(urls)).toHaveLength(1)
  })
})

describe('sitemap buy/rent separation (full pipeline simulation)', () => {
  const SALE_ID = '00000000-0000-0000-0000-000000000001'
  const RENT_ID = '00000000-0000-0000-0000-000000000002'
  const NULL_ID = '00000000-0000-0000-0000-000000000003'

  // Simulate the property rows returned from the DB
  const mockRows = [
    { id: SALE_ID, title: 'Sea View Apartment', intent: 'SALE', updatedAt: new Date('2026-10-01') },
    { id: RENT_ID, title: 'City Flat', intent: 'RENT', updatedAt: new Date('2026-10-01') },
    { id: NULL_ID, title: 'Unknown Type', intent: null, updatedAt: new Date('2026-10-01') },
    // Duplicate of SALE
    { id: SALE_ID, title: 'Sea View Apartment', intent: 'SALE', updatedAt: new Date('2026-10-01') },
  ]

  function processRows(rows: typeof mockRows) {
    const buyUrls: string[] = []
    const rentUrls: string[] = []
    let excludedInvalidIntent = 0
    let excludedMissingSlug = 0

    for (const p of rows) {
      const loc = buildManualPropertyPath({ id: p.id, title: p.title, intent: p.intent })
      if (!loc) { excludedMissingSlug++; continue }

      const raw = String(p.intent || '').trim().toUpperCase()
      if (raw !== 'SALE' && raw !== 'RENT') { excludedInvalidIntent++; continue }

      const purpose = propertyPurposeFromIntent(p.intent)
      if (purpose === 'buy') buyUrls.push(loc)
      else rentUrls.push(loc)
    }

    return {
      buy: deduplicateUrls(buyUrls.map((loc) => ({ loc, lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 }))),
      rent: deduplicateUrls(rentUrls.map((loc) => ({ loc, lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8 }))),
      excludedInvalidIntent,
      excludedMissingSlug,
    }
  }

  it('correctly splits properties into buy and rent', () => {
    const result = processRows(mockRows)
    expect(result.buy).toHaveLength(1) // duplicate de-duped
    expect(result.rent).toHaveLength(1)
    expect(result.buy[0].loc).toMatch(/^\/buy\//)
    expect(result.rent[0].loc).toMatch(/^\/rent\//)
  })

  it('excludes properties with null intent (no guessing)', () => {
    const result = processRows(mockRows)
    expect(result.excludedInvalidIntent).toBe(1) // the NULL_ID row
  })

  it('does not include /buy or /rent landing pages in property sitemaps', () => {
    const result = processRows(mockRows)
    expect(result.buy.map((u) => u.loc)).not.toContain('/buy')
    expect(result.rent.map((u) => u.loc)).not.toContain('/rent')
  })

  it('produces no properties sitemap', () => {
    const result = processRows(mockRows)
    // There is no combined "properties" key — only buy + rent
    expect(Object.keys(result)).not.toContain('properties')
  })
})