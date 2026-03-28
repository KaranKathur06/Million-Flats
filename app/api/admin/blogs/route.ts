import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(safeString(searchParams.get('page'))) || 1
  const limit = 20
  const offset = (page - 1) * limit

  const filters: any = {}
  const filterCategory = safeString(searchParams.get('category'))
  const filterStatus = safeString(searchParams.get('status'))
  const filterAuthor = safeString(searchParams.get('author'))
  const search = safeString(searchParams.get('search'))

  if (filterCategory) filters.categoryId = filterCategory
  if (filterStatus) filters.status = filterStatus.toUpperCase()
  if (filterAuthor) filters.authorId = filterAuthor

  const where: any = {}
  if (Object.keys(filters).length > 0) where.AND = [filters]

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { metaTitle: { contains: search, mode: 'insensitive' } },
      { metaDescription: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const blogs = await (prisma as any).blog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
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

    // Flatten tags from BlogTag join table
    const normalizedBlogs = (blogs as any[]).map((blog: any) => ({
      ...blog,
      tags: blog.tags?.map((bt: any) => bt.tag) || [],
    }))

    const totalCount = await (prisma as any).blog.count({ where })

    return NextResponse.json({
      success: true,
      data: normalizedBlogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Blog fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blogs' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const {
      title,
      excerpt,
      content,       // HTML string (backward compat)
      contentJson,   // JSON object from editor.getJSON()
      contentHtml,   // HTML string from editor.getHTML()
      featuredImageUrl,
      featuredImageAlt,
      targetKeyword,
      metaTitle,
      metaDescription,
      canonicalUrl,
      status,
      publishAt,
      categoryId,
      tags,
    } = body

    // Determine content sources
    const htmlContent = contentHtml || content || ''
    const jsonContent = contentJson || null

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Title is required' },
        { status: 400 }
      )
    }

    if (!htmlContent && !jsonContent) {
      return NextResponse.json(
        { success: false, message: 'Content is required' },
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      )
    }

    // Validate author
    const authorId = auth.userId

    // Validate category exists
    const category = await (prisma as any).category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Invalid category. Please create a category first.' },
        { status: 400 }
      )
    }

    // Strip HTML tags for word count
    const plainText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const wordCount = plainText.split(/\s+/).filter(Boolean).length
    const readTime = Math.ceil(wordCount / 200)

    // Calculate SEO score
    const seoScore = calculateSEOScore(
      title,
      metaDescription || '',
      plainText,
      targetKeyword || '',
      !!featuredImageUrl,
      featuredImageAlt,
      extractInternalLinksFromHtml(htmlContent),
      excerpt || ''
    )

    // Generate unique slug
    const baseSlug = generateSlug(title)
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existingBlog = await (prisma as any).blog.findUnique({
        where: { slug },
        select: { id: true },
      })
      if (!existingBlog) break
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create blog
    const blog = await (prisma as any).blog.create({
      data: {
        title,
        slug,
        excerpt: excerpt || '',
        content: htmlContent,
        contentJson: jsonContent,
        contentHtml: htmlContent,
        featuredImageUrl: featuredImageUrl || null,
        featuredImageAlt: featuredImageAlt || null,
        targetKeyword: targetKeyword || '',
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt || '',
        canonicalUrl: canonicalUrl || null,
        status: (status || 'DRAFT').toUpperCase(),
        publishAt: status?.toUpperCase() === 'SCHEDULED' && publishAt ? new Date(publishAt) : null,
        authorId,
        categoryId,
        seoScore,
        readTimeMinutes: readTime,
      },
    })

    // Add tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        if (!tagName || typeof tagName !== 'string') continue

        const tagSlug = generateSlug(tagName)
        let tag = await (prisma as any).tag.findUnique({
          where: { slug: tagSlug },
          select: { id: true },
        })

        if (!tag) {
          tag = await (prisma as any).tag.create({
            data: {
              name: tagName.trim(),
              slug: tagSlug,
            },
            select: { id: true },
          })
        }

        await (prisma as any).blogTag.create({
          data: {
            blogId: blog.id,
            tagId: tag.id,
          },
        }).catch(() => {
          // Ignore duplicate tag assignments
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: blog,
      message: 'Blog created successfully',
    })
  } catch (error) {
    console.error('Blog creation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create blog'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}

// ─── Helper Functions ──────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function calculateSEOScore(
  title: string,
  metaDescription: string,
  plainContent: string,
  targetKeyword: string,
  hasFeaturedImage: boolean,
  featuredImageAlt: string | null | undefined,
  internalLinks: number,
  excerpt: string
): number {
  if (!targetKeyword) return 0
  let score = 0

  const kw = targetKeyword.toLowerCase()

  // 1. Keyword in title (15 points)
  if (title.toLowerCase().includes(kw)) score += 15

  // 2. Keyword in meta description (15 points)
  if (metaDescription.toLowerCase().includes(kw)) score += 15

  // 3. Keyword in first 200 chars of content (10 points)
  const firstChunk = plainContent.substring(0, 200).toLowerCase()
  if (firstChunk.includes(kw)) score += 10

  // 4. Title length 30–70 chars (10 points)
  if (title.length >= 30 && title.length <= 70) score += 10

  // 5. Meta description 120–200 chars (10 points)
  if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10

  // 6. Word count >= 800 (10 points)
  const words = plainContent.split(/\s+/).filter(Boolean)
  if (words.length >= 800) score += 10

  // 7. Featured image (10 points)
  if (hasFeaturedImage) score += 10

  // 8. Image alt text (5 points)
  if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5

  // 9. Internal links >= 2 (10 points)
  if (internalLinks >= 2) score += 10

  // 10. Excerpt filled with 50+ chars (5 points)
  if (excerpt && excerpt.trim().length >= 50) score += 5

  return score
}

function extractInternalLinksFromHtml(html: string): number {
  const hrefRegex = /href=["'](\/?[^"']*?)["']/gi
  let count = 0
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1]
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('http')) {
      count++
    }
  }
  return count
}
