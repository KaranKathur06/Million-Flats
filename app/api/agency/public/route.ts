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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 200)
  const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1)

  try {
    const result = await getPublicAgencies({
      country: country || undefined,
      search: search || undefined,
      sort,
      limit,
      page,
    })

    return NextResponse.json(
      { success: true, data: result.agencies, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } },
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
