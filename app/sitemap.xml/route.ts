/**
 * GET /sitemap.xml — Sitemap Index
 *
 * Returns the sitemap index pointing to sub-sitemaps.
 * Cached for 24h, serves stale on failure.
 * No auth required — accessible to all crawlers.
 */

import { NextResponse } from 'next/server'
import { getSitemapXml } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24 hours

export async function GET() {
  try {
    const xml = await getSitemapXml('index')

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
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (err) {
    console.error('[Sitemap] Error serving sitemap index:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
