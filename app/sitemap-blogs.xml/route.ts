/**
 * GET /sitemap-blogs.xml — Blogs Sitemap
 */

import { NextResponse } from 'next/server'
import { getSitemapXml } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export async function GET() {
  try {
    const xml = await getSitemapXml('blogs')

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
  } catch (err) {
    console.error('[Sitemap] Error serving blogs sitemap:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
