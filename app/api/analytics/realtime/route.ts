/**
 * GET /api/analytics/realtime
 *
 * Returns only the realtime user count (lighter, 30s TTL).
 * Used by the RealtimeBadge component for polling.
 */

import { NextResponse } from 'next/server'
import { getRealtimeCount } from '@/lib/services/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const count = await getRealtimeCount()

    return NextResponse.json(
      { realtimeUsers: count, updatedAt: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (err) {
    console.error('[API /analytics/realtime] Error:', err)
    return NextResponse.json({ realtimeUsers: 0 }, { status: 500 })
  }
}
