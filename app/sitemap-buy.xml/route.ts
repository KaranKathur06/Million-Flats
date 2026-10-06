/**
 * GET /sitemap-buy.xml — Buy Property Sitemap
 *
 * Backward-compatible entry point. When the buy sitemap fits in one chunk
 * (≤50 000 URLs) this serves it directly. When chunked, the sitemap index
 * references /sitemap-buy-1.xml, /sitemap-buy-2.xml etc. directly, so this
 * endpoint is only hit by legacy bookmarks/references.
 *
 * For direct chunk access see /sitemap-buy-[n].xml/route.ts
 */

import { NextResponse } from 'next/server'
import { getSitemapXml } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export async function GET() {
  // Try single-chunk cache key first, then chunk-1 for the multi-chunk case
  const xml = (await getSitemapXml('buy')) ?? (await getSitemapXml('buy-1'))

  if (!xml) {
    return new NextResponse('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '3600' },
    })
  }

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
    },
  })
}