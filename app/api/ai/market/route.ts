// API: GET /api/ai/market
// Returns micromarket intelligence for a city/community pair

import { NextRequest, NextResponse } from 'next/server'
import { getMarketReport } from '@/lib/ai-core'
import { identityErrorResponse, resolveAIRequestIdentity } from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')
  const community = searchParams.get('community') ?? undefined
  const countryIso2 = searchParams.get('country') ?? 'AE'

  if (!city) {
    return NextResponse.json({ error: 'city is required' }, { status: 400 })
  }

  try {
    const marketKey = community
      ? `${countryIso2}:${city}:${community}`
      : `${countryIso2}:${city}`

    const report = await getMarketReport(marketKey, city, community, countryIso2)

    if (!report) {
      return NextResponse.json(
        { error: 'Insufficient market data for this location' },
        { status: 404 }
      )
    }

    const res = NextResponse.json({ success: true, data: report })
    res.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return res
  } catch (err: any) {
    console.error('[API /ai/market] market report failed', err)
    return NextResponse.json({ error: 'Market intelligence service temporarily unavailable' }, { status: 500 })
  }
}
