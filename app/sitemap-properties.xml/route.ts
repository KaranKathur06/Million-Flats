/**
 * GET /sitemap-properties.xml — REMOVED
 *
 * This sitemap type has been removed from the MillionFlats SEO architecture.
 * Properties are now represented under their canonical transaction-type sitemaps:
 *
 *   /sitemap-buy-1.xml  — individual BUY property URLs
 *   /sitemap-rent-1.xml — individual RENT property URLs
 *
 * Returns 410 Gone so Googlebot/Bingbot can deindex this endpoint permanently.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return new NextResponse(null, {
    status: 410,
    headers: {
      'X-Robots-Tag': 'noindex',
    },
  })
}
