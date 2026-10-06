/**
 * GET /sitemap-buy-[n].xml — Buy Property Sitemap (chunk n)
 *
 * Serves chunk n of the buy property sitemap.
 * Cache key: "buy-{n}" (e.g. "buy-1", "buy-2")
 *
 * When the total number of indexable buy properties is ≤ 50 000 only
 * /sitemap-buy-1.xml is generated. When it exceeds 50 000 additional
 * chunks are created automatically.
 */

import { NextResponse } from 'next/server'
import { getSitemapXml } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export async function GET(_req: Request, { params }: { params: { n: string } }) {
  const n = parseInt(params.n, 10)
  if (!Number.isFinite(n) || n < 1 || n > 999) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const xml = await getSitemapXml(`buy-${n}`)
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
