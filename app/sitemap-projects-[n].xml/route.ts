/**
 * GET /sitemap-projects-[n].xml — Projects Sitemap (chunk n)
 *
 * Serves chunk n of the projects sitemap.
 * Cache key: "projects-{n}" (e.g. "projects-1", "projects-2")
 *
 * Projects currently sit at 32 874 — approaching the 50 000 limit.
 * This handler ensures chunking works transparently as the catalog grows.
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

  const xml = await getSitemapXml(`projects-${n}`)
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
