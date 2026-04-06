/**
 * GET /api/system/sitemap/status — Sitemap Dashboard Data
 *
 * Returns current sitemap stats for the admin dashboard.
 * Protected via admin session.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { normalizeRole, hasMinRole } from '@/lib/rbac'
import { getSitemapDashboardData } from '@/lib/sitemap/sitemapService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const role = normalizeRole((session?.user as any)?.role)

    if (!session?.user || !hasMinRole(role, 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await getSitemapDashboardData()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Sitemap] Status API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch sitemap status' },
      { status: 500 }
    )
  }
}
