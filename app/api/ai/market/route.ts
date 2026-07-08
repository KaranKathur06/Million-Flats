// API: GET /api/ai/market
// Returns micromarket intelligence for a city/community pair

import { NextRequest, NextResponse } from 'next/server'
import { getMarketReport } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
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
    res.headers.set('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
