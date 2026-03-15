import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Check permissions
    if (!session?.user || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'EDITOR')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin or Editor access required' },
        { status: 403 }
      )
    }

    // Get all blogs for admin/editor
    const blogs = await (prisma as any).blog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: blogs })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Auth')) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, message: 'Failed to load blog editor' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Check permissions - only ADMIN and EDITOR can create blogs
    if (!session?.user || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'EDITOR')) {
      return NextResponse.json(
        { success: false, message: 'Only ADMIN and EDITOR can create blogs' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      title, excerpt, content, featuredImageUrl, featuredImageAlt,
      targetKeyword, metaTitle, metaDescription, canonicalUrl,
      status, publishAt, categoryId, tags
    } = body

    // Validation
    if (!title || !content || !metaTitle || !metaDescription) {
      return NextResponse.json(
        { success: false, message: 'Title, content, meta title, and meta description are required' },
        { status: 400 }
      )
    }

    // Check category exists
    const category = await (prisma as any).category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    })

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Invalid category' },
        { status: 400 }
      )
    }

    // Authenticate the user making the request
    const userId = (session.user as any).id

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

    // Create the blog
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
        publishAt: status === 'SCHEDULED' ? new Date(publishAt) : null,
        authorId: userId,
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
          select: { id: true }
        })

        if (!tag) {
          tag = await (prisma as any).tag.create({
            data: {
              name: tagName,
              slug: generateSlug(tagName)
            },
            select: { id: true }
          })
        }

        await (prisma as any).blogTag.create({
          data: {
            blogId: blog.id,
            tagId: tag.id
          }
        })
      }
    }

    return NextResponse.json({ success: true, data: blog })
  } catch (error) {
    console.error('Blog creation error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    )
  }
}

// Utility functions
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
  if (content.trim().split(/\s+/).filter(Boolean).length >= 800) score += 10

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
      if (url.startsWith(`/${currentSlug}`) || url === '/' || url.startsWith('/blog/')) {
        links.push(url)
      }
    }
  }

  return links
}