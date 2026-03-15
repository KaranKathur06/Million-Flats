// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function requireAdminSession() {
  const session = await getServerSession()

  if (!session || !session.user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  // Check if user has admin, editor, or author role
  const userRole = session.user.role as string
  const allowedRoles = ['ADMIN', 'EDITOR', 'AUTHOR']

  if (!allowedRoles.includes(userRole)) {
    return { ok: false, status: 403, message: 'Forbidden - Insufficient permissions' }
  }

  return { ok: true, user: session.user }
}

export async function requireAdminOrEditor() {
  const session = await getServerSession()

  if (!session || !session.user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const userRole = session.user.role as string
  const allowedRoles = ['ADMIN', 'EDITOR']

  if (!allowedRoles.includes(userRole)) {
    return { ok: false, status: 403, message: 'Forbidden - Admin or Editor only' }
  }

  return { ok: true, user: session.user }
}

export async function requireSuperAdmin() {
  const session = await getServerSession()

  if (!session || !session.user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  if (session.user.role !== 'ADMIN') {
    return { ok: false, status: 403, message: 'Forbidden - SuperAdmin only' }
  }

  return { ok: true, user: session.user }
}

// Blog APIs
export async function getAdminBlogList(params: {
  page?: number
  limit?: number
  category?: string
  status?: string
  author?: string
  search?: string
}) {
  const { page = 1, limit = 20, category, status, author, search } = params
  const offset = (page - 1) * limit

  const where: any = {}

  if (category) where.categoryId = category
  if (status) where.status = status.toUpperCase()
  if (author) where.authorId = author
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { metaTitle: { contains: search, mode: 'insensitive' } },
      { metaDescription: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [blogs, totalCount] = await Promise.all([
    prisma.blog.findMany({
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
    }),
    prisma.blog.count({ where }),
  ])

  return {
    success: true,
    data: blogs,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}

export async function getBlogById(id: string) {
  const blog = await prisma.blog.findUnique({
    where: { id },
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

  return { success: true, data: blog }
}

export async function getBlogBySlug(slug: string) {
  const blog = await prisma.blog.findUnique({
    where: { slug },
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

  return { success: true, data: blog }
}

export async function createBlog(data: any) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string

  // Check if user role allows creating blogs
  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(session.user.role as string)) {
    throw new Error('Forbidden - Only Admin and Editor can create blogs')
  }

  return prisma.$transaction(async (tx) => {
    // Generate slug
    let slug = generateSlug(data.title)
    let uniqueSlug = slug
    let counter = 1

    // Check if slug exists, make unique if needed
    while (await tx.blog.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter++}`
    }

    // Calculate SEO score
    const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length
    const readTime = Math.ceil(wordCount / 200)
    const contentPreview = data.content.split('\n')[0] || data.content

    const seoScore = calculateSEOScore(
      data.title,
      data.metaDescription,
      data.content,
      data.targetKeyword,
      !!data.featuredImageUrl,
      data.featuredImageAlt,
      extractInternalLinks(data.content, ''),
      data.excerpt
    )

    // Create blog
    const blog = await tx.blog.create({
      data: {
        title: data.title,
        slug: uniqueSlug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImageUrl: data.featuredImageUrl,
        featuredImageAlt: data.featuredImageAlt,
        targetKeyword: data.targetKeyword,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        canonicalUrl: data.canonicalUrl,
        status: data.status.toUpperCase(),
        publishAt: data.status === 'SCHEDULED' ? new Date(data.publishAt) : null,
        authorId: userId,
        categoryId: data.categoryId,
        seoScore,
        readTimeMinutes: readTime,
      },
    })

    // Create tags and associations
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const tagSlug = generateSlug(tagName)
        let tag = await tx.tag.findUnique({
          where: { slug: tagSlug },
        })

        if (!tag) {
          tag = await tx.tag.create({
            data: {
              name: tagName,
              slug: tagSlug,
            },
          })
        }

        await tx.blogTag.create({
          data: {
            blogId: blog.id,
            tagId: tag.id,
          },
        })
      }
    }

    // Fetch blog with relations
    const createdBlog = await tx.blog.findUnique({
      where: { id: blog.id },
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

    return createdBlog
  })
}

export async function updateBlog(id: string, data: any) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const userRole = session.user.role as string

  // Get existing blog
  const existingBlog = await prisma.blog.findUnique({
    where: { id },
  })

  if (!existingBlog) {
    throw new Error('Blog not found')
  }

  // Permission checks
  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  // If not admin, can only edit own blogs if role is EDITOR
  if (userRole === 'EDITOR' && existingBlog.authorId !== userId) {
    throw new Error('Forbidden - Can only edit own blogs')
  }

  // Calculate SEO score
  const seoScore = calculateSEOScore(
    data.title,
    data.metaDescription,
    data.content,
    data.targetKeyword,
    !!data.featuredImageUrl,
    data.featuredImageAlt,
    extractInternalLinks(data.content, existingBlog.slug),
    data.excerpt
  )

  const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.ceil(wordCount / 200)

  // Update blog
  const blog = await prisma.blog.update({
    where: { id },
    data: {
      title: data.title,
      slug: generateSlug(data.title),
      excerpt: data.excerpt,
      content: data.content,
      featuredImageUrl: data.featuredImageUrl,
      featuredImageAlt: data.featuredImageAlt,
      targetKeyword: data.targetKeyword,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      canonicalUrl: data.canonicalUrl,
      status: data.status.toUpperCase(),
      publishAt: data.status === 'SCHEDULED' ? new Date(data.publishAt) : null,
      categoryId: data.categoryId,
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

  return { success: true, data: blog }
}

export async function deleteBlog(id: string) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const userRole = session.user.role as string

  // Get blog
  const blog = await prisma.blog.findUnique({
    where: { id },
  })

  if (!blog) {
    throw new Error('Blog not found')
  }

  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  // If not admin, can only delete own draft blogs
  if (userRole === 'EDITOR') {
    if (blog.authorId !== userId) {
      throw new Error('Forbidden - Can only delete own blogs')
    }
    if (blog.status !== 'DRAFT') {
      throw new Error('Forbidden - Can only delete draft blogs')
    }
  }

  await prisma.blog.delete({ where: { id } })
  return { success: true }
}

export async function duplicateBlog(id: string) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userId = session.user.id as string
  const userRole = session.user.role as string

  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  const original = await prisma.blog.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  if (!original) {
    throw new Error('Blog not found')
  }

  // Create duplicate
  const duplicate = await prisma.blog.create({
    data: {
      title: `${original.title} (Copy)`,
      slug: generateSlug(`${original.title} Copy`),
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
    await prisma.blogTag.create({
      data: {
        blogId: duplicate.id,
        tagId: blogTag.tag.id,
      },
    })
  }

  return { success: true, data: duplicate }
}

export async function publishBlog(id: string) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userRole = session.user.role as string
  const userId = session.user.id as string

  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  const blog = await prisma.blog.findUnique({ where: { id } })
  if (!blog) {
    throw new Error('Blog not found')
  }

  // Editors can publish their own blogs
  if (userRole === 'EDITOR' && blog.authorId !== userId) {
    throw new Error('Forbidden')
  }

  await prisma.blog.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishAt: new Date(),
    },
  })

  return { success: true }
}

export async function scheduleBlog(id: string, publishAt: string) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userRole = session.user.role as string
  const userId = session.user.id as string

  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  const blog = await prisma.blog.findUnique({ where: { id } })
  if (!blog) {
    throw new Error('Blog not found')
  }

  if (userRole === 'EDITOR' && blog.authorId !== userId) {
    throw new Error('Forbidden')
  }

  await prisma.blog.update({
    where: { id },
    data: {
      status: 'SCHEDULED',
      publishAt: new Date(publishAt),
    },
  })

  return { success: true }
}

export async function unpublishBlog(id: string) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const userRole = session.user.role as string

  const allowedRoles = ['ADMIN', 'EDITOR']
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Forbidden')
  }

  await prisma.blog.update({
    where: { id },
    data: {
      status: 'DRAFT',
      publishAt: null,
    },
  })

  return { success: true }
}

// Category APIs
export async function getCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })
  return { success: true, data: categories }
}

export async function createCategory(data: any) {
  const session = await getServerSession()
  if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    throw new Error('Forbidden')
  }

  const slug = generateSlug(data.name)

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId || null,
    },
  })

  return { success: true, data: category }
}

export async function updateCategory(id: string, data: any) {
  const session = await getServerSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: generateSlug(data.name),
      description: data.description,
      parentId: data.parentId || null,
    },
  })

  return { success: true, data: category }
}

export async function deleteCategory(id: string) {
  const session = await getServerSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  // Check if category has blogs
  const blogCount = await prisma.blog.count({
    where: { categoryId: id },
  })

  if (blogCount > 0) {
    throw new Error('Cannot delete category with associated blogs')
  }

  await prisma.category.delete({ where: { id } })
  return { success: true }
}

// Tag APIs
export async function getTags() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
  })
  return { success: true, data: tags }
}

export async function createTag(data: any) {
  const session = await getServerSession()
  if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    throw new Error('Forbidden')
  }

  const slug = generateSlug(data.name)

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      slug,
    },
  })

  return { success: true, data: tag }
}

export async function deleteTag(id: string) {
  const session = await getServerSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  await prisma.tag.delete({ where: { id } })
  return { success: true }
}

// Analytics APIs
export async function getDashboardStats() {
  const session = await getServerSession()
  if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role as string)) {
    throw new Error('Forbidden')
  }

  const [totalBlogs, publishedBlogs, totalViews, avgSeoScore, recentBlogs] = await Promise.all([
    prisma.blog.count(),
    prisma.blog.count({ where: { status: 'PUBLISHED' } }),
    prisma.blog.aggregate({
      _sum: { views: true },
    }),
    prisma.blog.aggregate({
      _avg: { seoScore: true },
    }),
    prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    }),
  ])

  return {
    success: true,
    data: {
      blogStats: {
        totalBlogs,
        publishedBlogs,
        totalViews: totalViews._sum.views || 0,
        avgSeoScore: Math.round(avgSeoScore._avg.seoScore || 0),
      },
      recentBlogs,
    },
  }
}

export async function incrementBlogView(blogId: string) {
  await prisma.blog.update({
    where: { id: blogId },
    data: {
      views: {
        increment: 1,
      },
    },
  })
  return { success: true }
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
  featuredImageAlt: string | null,
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

function extractInternalLinks(content: string): string[] {
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