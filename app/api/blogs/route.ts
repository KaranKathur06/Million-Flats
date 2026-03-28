import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const offset = (page - 1) * limit
  const category = String(searchParams.get('category') || '').trim()
  const tag = String(searchParams.get('tag') || '').trim()
  const search = String(searchParams.get('search') || '').trim()

  try {
    const now = new Date()

    const publicBlogWhere: any = {
      status: 'PUBLISHED',
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    }

    const andFilters: any[] = [publicBlogWhere]

    if (category) {
      andFilters.push({ category: { slug: category } })
    }

    if (tag) {
      andFilters.push({
        tags: {
          some: {
            tag: { slug: tag },
          },
        },
      })
    }

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    const where = { AND: andFilters }

    const [blogs, total, categoryRows, featured] = await Promise.all([
      (prisma as any).blog.findMany({
        where,
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImageUrl: true,
          featuredImageAlt: true,
          readTimeMinutes: true,
          createdAt: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      (prisma as any).blog.count({ where }),
      (prisma as any).category.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              blogs: {
                where: publicBlogWhere,
              },
            },
          },
        },
      }),
      (prisma as any).blog.findMany({
        where: publicBlogWhere,
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        take: 2,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImageUrl: true,
          featuredImageAlt: true,
          readTimeMinutes: true,
          createdAt: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    ])

    const categories = (categoryRows as any[])
      .filter((entry) => Number(entry?._count?.blogs || 0) > 0)
      .map((entry) => ({
        slug: String(entry.slug || ''),
        name: String(entry.name || ''),
        count: Number(entry?._count?.blogs || 0),
      }))

    const response = {
      success: true,
      data: blogs,
      featured,
      filters: {
        categories,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Public blog fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blogs' },
      { status: 500 }
    )
  }
}
