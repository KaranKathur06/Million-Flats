import { NextResponse } from 'next/server'
import { getPublicAgencies, type PublicAgencySort } from '@/lib/agencies/getPublicAgencies'

export const runtime = 'nodejs'

const VALID_SORTS: PublicAgencySort[] = ['featured', 'newest', 'most_active', 'alphabetical']

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || '').trim()
  const search = (searchParams.get('search') || '').trim()
  const rawSort = (searchParams.get('sort') || 'featured').trim() as PublicAgencySort
  const sort: PublicAgencySort = VALID_SORTS.includes(rawSort) ? rawSort : 'featured'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100') || 100, 200)

  try {
    const { agencies } = await getPublicAgencies({
      country: country || undefined,
      search: search || undefined,
      sort,
      limit,
    })

    return NextResponse.json(
      { success: true, data: agencies },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('[GET /api/agency/public] error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch agencies' },
      { status: 500 }
    )
  }
}
