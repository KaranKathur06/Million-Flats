import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const blog = await (prisma as any).blog.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Permission check
    const userRole = (session.user as any)?.role
    const userId = (session.user as any)?.id
    if (!['ADMIN', 'EDITOR'].includes(userRole) && blog.authorId !== userId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: blog })
  } catch (error) {
    console.error('Get blog error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const userId = (session.user as any)?.id as string
    const userRole = (session.user as any)?.role

    // Get existing blog
    const existingBlog = await (prisma as any).blog.findUnique({
      where: { id: params.id },
    })

    if (!existingBlog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Permission check
    const allowedRoles = ['ADMIN', 'EDITOR']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    if (userRole === 'EDITOR' && existingBlog.authorId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Can only edit own blogs' },
        { status: 403 }
      )
    }

    // Validate category exists
    if (body.categoryId) {
      const category = await (prisma as any).category.findUnique({
        where: { id: body.categoryId },
      })
      if (!category) {
        return NextResponse.json(
          { success: false, message: 'Invalid category' },
          { status: 400 }
        )
      }
    }

    // Calculate SEO score
    const seoScore = calculateSEOScore(
      body.title,
      body.metaDescription,
      body.content,
      body.targetKeyword,
      !!body.featuredImageUrl,
      body.featuredImageAlt,
      extractInternalLinks(body.content),
      body.excerpt
    )

    const wordCount = body.content.trim().split(/\s+/).filter(Boolean).length
    const readTime = Math.ceil(wordCount / 200)

    const slug = await createUniqueSlug(body.title, params.id)

    const updatedBlog = await (prisma as any).blog.update({
      where: { id: params.id },
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt,
        content: body.content,
        featuredImageUrl: body.featuredImageUrl,
        featuredImageAlt: body.featuredImageAlt,
        targetKeyword: body.targetKeyword,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        canonicalUrl: body.canonicalUrl,
        status: body.status?.toUpperCase() || existingBlog.status,
        publishAt: body.status === 'SCHEDULED' ? new Date(body.publishAt) : null,
        categoryId: body.categoryId,
        seoScore,
        readTimeMinutes: readTime,
      },
      include: {
        author: true,
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedBlog,
    })
  } catch (error) {
    console.error('Update blog error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update blog' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const blog = await (prisma as any).blog.findUnique({
      where: { id: params.id },
    })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // If not admin, can only delete own draft blogs
    if (userRole === 'EDITOR') {
      if (blog.authorId !== userId) {
        return NextResponse.json(
          { success: false, message: 'Forbidden - Can only delete own blogs' },
          { status: 403 }
        )
      }
      if (blog.status !== 'DRAFT') {
        return NextResponse.json(
          { success: false, message: 'Forbidden - Can only delete draft blogs' },
          { status: 403 }
        )
      }
    }

    await (prisma as any).blog.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete blog error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete blog' },
      { status: 500 }
    )
  }
}

// Utility functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function createUniqueSlug(title: string, currentBlogId: string): Promise<string> {
  const baseSlug = generateSlug(title) || 'blog'
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await (prisma as any).blog.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing || existing.id === currentBlogId) return slug
    slug = `${baseSlug}-${counter++}`
  }
}

function calculateSEOScore(
  title: string,
  metaDescription: string,
  content: string,
  targetKeyword: string,
  hasFeaturedImage: boolean,
  featuredImageAlt: string | null,
  internalLinks: number,
  excerpt: string
): number {
  let score = 0

  if (title.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15
  if (metaDescription.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

  const firstParagraph = content.split('\n')[0] || content
  if (firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) score += 10

  if (title.length >= 30 && title.length <= 70) score += 10
  if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10

  if (content.trim().split(/\s+/).filter(Boolean).length >= 800) score += 10

  if (hasFeaturedImage) score += 10
  if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5
  if (internalLinks >= 2) score += 10
  if (excerpt && excerpt.trim().length >= 50) score += 5

  return score
}

function extractInternalLinks(content: string): number {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let count = 0
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2]
    if (url.startsWith('/') && !url.includes('http')) count++
  }
  return count
}
