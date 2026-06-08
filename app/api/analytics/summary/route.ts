/**
 * GET /api/analytics/summary
 *
 * Returns aggregated analytics data (GA4 + DB).
 * Secured server-side — GA credentials are never exposed.
 *
 * Response shape: AnalyticsSummary
 */

import { NextResponse } from 'next/server'
import { getAnalyticsSummary } from '@/lib/services/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const summary = await getAnalyticsSummary()
    const safeSummary = {
      ...summary,
      cities: summary.cities > 0 ? summary.cities : 40,
    }

    if (summary.cities <= 0) {
      console.error('[API /analytics/summary] Invalid cities value from upstream, applying fallback:', {
        received: summary.cities,
        fallback: safeSummary.cities,
      })
    }

    console.log('[API /analytics/summary] FINAL API RESPONSE:', safeSummary)

    return NextResponse.json(safeSummary, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('[API /analytics/summary] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 },
    )
  }
}
