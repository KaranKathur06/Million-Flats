/**
 * POST /api/system/sitemap/generate — Cron/Manual Sitemap Regeneration
 *
 * Can be called by:
 *   1. Vercel Cron (with CRON_SECRET header)
 *   2. Admin dashboard (with admin session)
 *
 * Protected via shared secret or admin auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizeRole, hasMinRole } from '@/lib/rbac'
import { generateAllSitemaps } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for large sitemaps

export async function POST(req: NextRequest) {
  try {
    // Auth check: Cron secret OR admin session
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')

    const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCronAuth) {
      // Fallback to admin session auth
      const session = await getServerSession(authOptions)
      const role = normalizeRole((session?.user as any)?.role)

      if (!session?.user || !hasMinRole(role, 'ADMIN')) {
        return NextResponse.json(
          { error: 'Unauthorized. Requires CRON_SECRET or ADMIN role.' },
          { status: 401 }
        )
      }
    }

    const result = await generateAllSitemaps()

    return NextResponse.json({
      success: result.success,
      totalUrls: result.totalUrls,
      sitemaps: result.sitemaps,
      errors: result.errors,
      generatedAt: result.generatedAt,
      durationMs: result.durationMs,
    })
  } catch (err) {
    console.error('[Sitemap] Generation API error:', err)
    return NextResponse.json(
      { error: 'Sitemap generation failed', details: String(err) },
      { status: 500 }
    )
  }
}

// Also allow GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req)
}
