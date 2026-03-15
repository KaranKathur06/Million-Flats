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
      },
    })

    const totalCount = await (prisma as any).blog.count({ where })

    return NextResponse.json({
      success: true,
      data: blogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
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
    const { title, excerpt, content, featuredImageUrl, featuredImageAlt, targetKeyword, metaTitle, metaDescription, canonicalUrl, status, publishAt, categoryId, tags } = body

    // Validate author
    const authorId = auth.userId

    // Validate category
    const category = await (prisma as any).category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      )
    }

    // Calculate SEO score
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    const readTime = Math.ceil(wordCount / 200)

    const seoScore = calculateSEOScore(
      title,
      metaDescription,
      content,
      targetKeyword,
      !!featuredImageUrl,
      featuredImageAlt,
      extractInternalLinks(content, '').length,
      excerpt
    )

    const blog = await (prisma as any).blog.create({
      data: {
        title,
        slug: generateSlug(title),
        excerpt,
        content,
        featuredImageUrl,
        featuredImageAlt,
        targetKeyword,
        metaTitle,
        metaDescription,
        canonicalUrl,
        status: status.toUpperCase(),
        publishAt: status.toUpperCase() === 'SCHEDULED' ? new Date(publishAt) : null,
        authorId,
        categoryId,
        seoScore,
        readTimeMinutes: readTime,
      },
    })

    // Add tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await (prisma as any).tag.findUnique({
          where: { slug: generateSlug(tagName) },
          select: { id: true },
        })

        if (!tag) {
          tag = await (prisma as any).tag.create({
            data: {
              name: tagName,
              slug: generateSlug(tagName),
            },
            select: { id: true },
          })
        }

        await (prisma as any).blogTag.create({
          data: {
            blogId: blog.id,
            tagId: tag.id,
          },
        })
      }
    }

    return NextResponse.json({ success: true, data: blog })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create blog' },
      { status: 500 }
    )
  }
}

// Helper functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function calculateSEOScore(
  title: string,
  metaDescription: string,
  content: string,
  targetKeyword: string,
  hasFeaturedImage: boolean,
  featuredImageAlt: string | null | undefined,
  internalLinks: number,
  excerpt: string
): number {
  let score = 0

  // 1. Keyword in title (15 points)
  if (title.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

  // 2. Keyword in meta description (15 points)
  if (metaDescription.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

  // 3. Keyword in first paragraph (10 points)
  const firstParagraph = content.split('\n')[0] || content
  if (firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) score += 10

  // 4. Meta title length (10 points)
  const metaTitleLength = title.length
  if (metaTitleLength >= 30 && metaTitleLength <= 70) score += 10

  // 5. Meta description length (10 points)
  const metaDescLength = metaDescription.length
  if (metaDescLength >= 120 && metaDescLength <= 200) score += 10

  // 6. Word count >= 800 (10 points)
  const words = content.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 800) score += 10

  // 7. Featured image (10 points)
  if (hasFeaturedImage) score += 10

  // 8. Image alt text (5 points)
  if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5

  // 9. Internal links >= 2 (10 points)
  if (internalLinks >= 2) score += 10

  // 10. Excerpt filled (5 points)
  if (excerpt && excerpt.trim().length >= 50) score += 5

  return score
}

function extractInternalLinks(content: string, currentSlug: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const links: string[] = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2]
    if (url.startsWith('/') && !url.includes('http')) {
      links.push(url)
    }
  }

  return links
}