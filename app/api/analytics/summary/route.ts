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

    return NextResponse.json(summary, {
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
