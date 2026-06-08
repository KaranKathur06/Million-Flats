import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * POST /api/admin/blogs/draft
 *
 * Save or update a blog draft. If `blogId` is provided, updates the existing
 * blog. Otherwise creates a new draft blog entry.
 *
 * This prevents duplicate drafts: the frontend stores the returned blogId
 * and sends it on subsequent auto-saves.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id as string
    const userRole = (session.user as any)?.role
    const allowedRoles = ['ADMIN', 'EDITOR', 'SUPERADMIN']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
    }

    const blogId = safeString(body.blogId)
    const title = safeString(body.title)
    const content = safeString(body.content)
    const contentJson = body.contentJson || null
    const contentHtml = safeString(body.contentHtml) || content
    const excerpt = safeString(body.excerpt)
    const targetKeyword = safeString(body.targetKeyword)
    const metaTitle = safeString(body.metaTitle)
    const metaDescription = safeString(body.metaDescription)
    const canonicalUrl = safeString(body.canonicalUrl)
    const featuredImageUrl = safeString(body.featuredImageUrl)
    const featuredImageAlt = safeString(body.featuredImageAlt)
    const categoryId = safeString(body.categoryId)

    if (!title) {
      return NextResponse.json({ success: false, message: 'Title is required for draft' }, { status: 400 })
    }

    // Calculate basic read time
    const plainText = (contentHtml || content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const wordCount = plainText.split(/\s+/).filter(Boolean).length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    // If blogId exists → UPDATE existing blog draft
    if (blogId) {
      const existingBlog = await (prisma as any).blog.findUnique({
        where: { id: blogId },
        select: { id: true, authorId: true, status: true },
      })

      if (!existingBlog) {
        return NextResponse.json({ success: false, message: 'Blog not found for draft update' }, { status: 404 })
      }

      // Only allow updating own drafts unless admin
      if (userRole === 'EDITOR' && existingBlog.authorId !== userId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
      }

      const updateData: any = {
        title,
        content: contentHtml || content || '',
        contentJson,
        contentHtml: contentHtml || content || '',
        excerpt: excerpt || '',
        readTimeMinutes: readTime,
      }

      if (targetKeyword) updateData.targetKeyword = targetKeyword
      if (metaTitle) updateData.metaTitle = metaTitle
      if (metaDescription) updateData.metaDescription = metaDescription
      if (canonicalUrl) updateData.canonicalUrl = canonicalUrl
      if (featuredImageUrl) updateData.featuredImageUrl = featuredImageUrl
      if (featuredImageAlt) updateData.featuredImageAlt = featuredImageAlt
      if (categoryId) updateData.categoryId = categoryId

      const updated = await (prisma as any).blog.update({
        where: { id: blogId },
        data: updateData,
        select: { id: true, updatedAt: true },
      })

      console.log('DRAFT UPDATED:', updated.id)
      return NextResponse.json({ success: true, data: { blogId: updated.id, updatedAt: updated.updatedAt } })
    }

    // No blogId → CREATE a new draft blog
    // Need a category to create the blog. If none provided, try to find or create a default "Uncategorized" category
    let resolvedCategoryId = categoryId

    if (!resolvedCategoryId) {
      const defaultCategory = await (prisma as any).category.findFirst({
        where: { slug: 'uncategorized' },
        select: { id: true },
      })

      if (defaultCategory) {
        resolvedCategoryId = defaultCategory.id
      } else {
        const newCategory = await (prisma as any).category.create({
          data: { name: 'Uncategorized', slug: 'uncategorized' },
          select: { id: true },
        })
        resolvedCategoryId = newCategory.id
      }
    }

    // Generate unique slug
    const baseSlug = generateSlug(title) || 'draft'
    let slug = baseSlug
    let counter = 1
    while (true) {
      const existingSlug = await (prisma as any).blog.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (!existingSlug) break
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const blog = await (prisma as any).blog.create({
      data: {
        title,
        slug,
        excerpt: excerpt || '',
        content: contentHtml || content || '',
        contentJson,
        contentHtml: contentHtml || content || '',
        featuredImageUrl: featuredImageUrl || null,
        featuredImageAlt: featuredImageAlt || null,
        targetKeyword: targetKeyword || '',
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || '',
        canonicalUrl: canonicalUrl || null,
        status: 'DRAFT',
        publishAt: null,
        authorId: userId,
        categoryId: resolvedCategoryId,
        seoScore: 0,
        readTimeMinutes: readTime,
      },
      select: { id: true, createdAt: true },
    })

    if (!blog) {
      console.error('DRAFT CREATE FAILED: prisma returned null')
      return NextResponse.json({ success: false, message: 'Failed to create draft' }, { status: 500 })
    }

    console.log('DRAFT CREATED:', blog.id)
    return NextResponse.json({ success: true, data: { blogId: blog.id, createdAt: blog.createdAt } })
  } catch (error) {
    console.error('Draft save error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save draft' },
      { status: 500 }
    )
  }
}

