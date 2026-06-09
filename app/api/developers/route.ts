import { NextResponse } from 'next/server'
import { getPublicDevelopers, type PublicDeveloperSort } from '@/lib/developers/getPublicDevelopers'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const country = (searchParams.get('country') || '').trim()
  const featured = searchParams.get('featured') === 'true'
  const search = (searchParams.get('search') || '').trim()
  const sort = (searchParams.get('sort') || 'featured') as PublicDeveloperSort
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200)

  try {
    const { developers } = await getPublicDevelopers({
      country: country || undefined,
      featured,
      search: search || undefined,
      sort,
      limit,
    })

    return NextResponse.json(
      { success: true, data: developers },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Public developer fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch developers' },
      { status: 500 }
    )
  }
}
