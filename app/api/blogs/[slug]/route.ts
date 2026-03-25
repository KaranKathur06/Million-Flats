import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const blog = await (prisma as any).blog.findUnique({
      where: { slug: params.slug },
      include: {
        author: {
          select: { name: true, image: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })

    if (!blog || blog.status !== 'PUBLISHED') {
      return NextResponse.json(
        { success: false, message: 'Blog not found' },
        { status: 404 }
      )
    }

    // Increment view count (fire and forget)
    ;(prisma as any).blog
      .update({
        where: { id: blog.id },
        data: { views: { increment: 1 } },
      })
      .catch(() => {})

    const normalizedBlog = {
      ...blog,
      tags: blog.tags?.map((bt: any) => bt.tag) || [],
    }

    return NextResponse.json({
      success: true,
      data: normalizedBlog,
    })
  } catch (error) {
    console.error('Blog detail fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog' },
      { status: 500 }
    )
  }
}
