/**
 * GET /robots.txt — Crawler Directives
 *
 * Publicly accessible. Tells search engines what to crawl
 * and where to find the sitemap.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://millionflats.com').replace(/\/$/, '')

export async function GET() {
  const robotsTxt = `# MillionFlats — robots.txt
# Generated automatically

User-agent: *
Allow: /

# Block admin, auth and internal areas
Disallow: /admin/
Disallow: /admin
Disallow: /auth/
Disallow: /api/
Disallow: /agent/
Disallow: /agent-portal/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /profile/
Disallow: /verix/
Disallow: /verfix-system/
Disallow: /unauthorized
Disallow: /suspended

# Block internal utilities
Disallow: /_next/
Disallow: /user/

# Sitemap location
Sitemap: ${BASE_URL}/sitemap.xml

# Crawl delay (optional, respected by some bots)
Crawl-delay: 1
`

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
