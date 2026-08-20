/**
 * GET /robots.txt — Crawler Directives
 *
 * Publicly accessible. Tells search engines what to crawl
 * and where to find the sitemap.
 */

import { NextResponse } from 'next/server'
export const dynamic = 'force-static'

export async function GET() {
  const robotsTxt = `# =========================================================
# MillionFlats — Clean, Optimized & AI-Friendly Robots.txt
# =========================================================

# 1. Global Rule for Regular Search Engines & AI Bots
User-agent: *
Content-Signal: search=yes,ai-input=yes,ai-train=no,use=full
Allow: /

# Block admin, authentication, and secure private internal areas
Disallow: /admin/
Disallow: /admin
Disallow: /auth/
Disallow: /api/
Disallow: /agent/
Disallow: /agent-portal/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /profile/
Disallow: /unauthorized
Disallow: /suspended

# Block framework internal architecture files (Next.js backend)
Disallow: /_next/
Disallow: /user/

# Explicitly ensure premium AI engines can scrape property data for search results
User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /agent-portal/

User-agent: Google-Extended
Allow: /
Disallow: /admin/
Disallow: /agent-portal/

User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /agent-portal/

User-agent: PerplexityBot
Allow: /

# 2. Block Known Malicious, Aggressive, or Spam Aggregator Bots
User-agent: Rogerbot
Disallow: /

User-agent: Exabot
Disallow: /

User-agent: DotBot
Disallow: /

# 3. XML Sitemap Location (Crucial for Google and AI Indexing)
Sitemap: https://millionflats.com/sitemap.xml

# Crawl delay to protect server resources
Crawl-delay: 1
`

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=0',
    },
  })
}
