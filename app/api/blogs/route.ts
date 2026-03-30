import { NextResponse } from 'next/server'
import { getPublicBlogsData } from '@/lib/blogs/public'

function toPositiveInt(input: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(String(input || ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

export const revalidate = 60

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const page = toPositiveInt(searchParams.get('page'), 1, 10_000)
  const limit = toPositiveInt(searchParams.get('limit'), 10, 50)
  const category = String(searchParams.get('category') || '').trim()
  const search = String(searchParams.get('search') || '').trim()

  try {
    const data = await getPublicBlogsData({ search, category, page: String(page) }, limit)

    return NextResponse.json(
      {
        success: true,
        data: data.blogs,
        featured: data.featured,
        filters: {
          categories: data.categories,
        },
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Public blog fetch error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch blogs' }, { status: 500 })
  }
}

