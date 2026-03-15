import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id as string
    const userRole = (session.user as any)?.role

    const allowedRoles = ['ADMIN', 'EDITOR']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const original = await (prisma as any).blog.findUnique({
      where: { id: params.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Create duplicate
    const duplicate = await (prisma as any).blog.create({
      data: {
        title: `${original.title} (Copy)`,
        slug: generateSlug(`${original.title} Copy ${Date.now()}`),
        excerpt: original.excerpt,
        content: original.content,
        featuredImageUrl: original.featuredImageUrl,
        featuredImageAlt: original.featuredImageAlt,
        targetKeyword: original.targetKeyword,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        canonicalUrl: original.canonicalUrl,
        status: 'DRAFT',
        authorId: userId,
        categoryId: original.categoryId,
        seoScore: 0,
        readTimeMinutes: original.readTimeMinutes,
      },
    })

    // Copy tags
    for (const blogTag of original.tags) {
      await (prisma as any).blogTag.create({
        data: {
          blogId: duplicate.id,
          tagId: blogTag.tag.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: duplicate,
    })
  } catch (error) {
    console.error('Duplicate blog error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to duplicate blog' },
      { status: 500 }
    )
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}