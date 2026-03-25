import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1') || 1
  const limit = parseInt(searchParams.get('limit') || '12') || 12
  const offset = (page - 1) * limit
  const category = searchParams.get('category') || ''
  const tag = searchParams.get('tag') || ''
  const search = searchParams.get('search') || ''

  try {
    const where: any = {
      status: 'PUBLISHED',
    }

    if (category) {
      where.category = { slug: category }
    }

    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [blogs, total] = await Promise.all([
      (prisma as any).blog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
          views: true,
          createdAt: true,
          publishAt: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
          author: {
            select: { name: true, image: true },
          },
          tags: {
            include: {
              tag: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      (prisma as any).blog.count({ where }),
    ])

    const normalizedBlogs = (blogs as any[]).map((blog: any) => ({
      ...blog,
      tags: blog.tags?.map((bt: any) => bt.tag) || [],
    }))

    return NextResponse.json({
      success: true,
      data: normalizedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
