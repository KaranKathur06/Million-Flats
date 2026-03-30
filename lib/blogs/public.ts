import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const BLOGS_REVALIDATE_SECONDS = 60
export const BLOGS_CACHE_TAG = 'blogs-public'
const DEFAULT_LIMIT = 10

export type PublicBlogCard = {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  readTimeMinutes: number
  createdAt: Date
  category: { id: string; name: string; slug: string } | null
}

export function sanitizeBlogSlug(raw: string): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw).trim().toLowerCase().replace(/\/+$/, '')
  } catch {
    return String(raw).trim().toLowerCase().replace(/\/+$/, '')
  }
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getPublicBlogWhere(now: Date) {
  return {
    status: 'PUBLISHED',
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
  }
}

async function queryBlogsData(params: {
  search?: string
  category?: string
  page?: number
  limit?: number
}) {
  const now = new Date()
  const page = Math.max(1, Number(params.page || 1))
  const limit = Math.max(1, Math.min(50, Number(params.limit || DEFAULT_LIMIT)))
  const search = String(params.search || '').trim()
  const category = String(params.category || '').trim()
  const publicWhere = getPublicBlogWhere(now)

  const andFilters: any[] = [publicWhere]

  if (search) {
    andFilters.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  if (category) {
    andFilters.push({ category: { slug: category } })
  }

  const where = { AND: andFilters }
  const skip = (page - 1) * limit

  if (process.env.NODE_ENV !== 'production') {
    console.time(`[blogs] query page=${page} limit=${limit}`)
  }

  try {
    const [blogs, total, featured, categoryRows] = await Promise.all([
      (prisma as any).blog.findMany({
        where,
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        skip,
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
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      (prisma as any).blog.count({ where }),
      !search && !category && page === 1
        ? (prisma as any).blog.findMany({
            where: publicWhere,
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
              category: { select: { id: true, name: true, slug: true } },
            },
          })
        : Promise.resolve([]),
      (prisma as any).category.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              blogs: {
                where: publicWhere,
              },
            },
          },
        },
      }),
    ])

    const categories = (categoryRows as any[])
      .filter((item) => Number(item?._count?.blogs || 0) > 0)
      .map((item) => ({
        slug: String(item.slug || ''),
        name: String(item.name || ''),
        count: Number(item?._count?.blogs || 0),
      }))

    return {
      blogs: blogs as PublicBlogCard[],
      featured: featured as PublicBlogCard[],
      categories,
      total,
      page,
      limit,
      search,
      category,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd(`[blogs] query page=${page} limit=${limit}`)
    }
  }
}

const getCachedBlogsData = unstable_cache(
  async (search: string, category: string, page: number, limit: number) =>
    queryBlogsData({ search, category, page, limit }),
  ['blogs-data-cache'],
  { revalidate: BLOGS_REVALIDATE_SECONDS, tags: [BLOGS_CACHE_TAG] }
)

export async function getPublicBlogsData(searchParams?: { search?: string; category?: string; page?: string }, limit = DEFAULT_LIMIT) {
  const page = toPositiveInt(searchParams?.page, 1)
  const search = String(searchParams?.search || '').trim()
  const category = String(searchParams?.category || '').trim()
  return getCachedBlogsData(search, category, page, limit)
}

async function queryPublishedBlogBySlug(slug: string) {
  const normalizedSlug = sanitizeBlogSlug(slug)
  if (!normalizedSlug) return null

  const now = new Date()
  const blog = await (prisma as any).blog.findUnique({
    where: { slug: normalizedSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      contentHtml: true,
      featuredImageUrl: true,
      featuredImageAlt: true,
      metaTitle: true,
      metaDescription: true,
      canonicalUrl: true,
      targetKeyword: true,
      readTimeMinutes: true,
      status: true,
      publishAt: true,
      createdAt: true,
      views: true,
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!blog) return null
  if (blog.status !== 'PUBLISHED') return null
  if (blog.publishAt && new Date(blog.publishAt) > now) return null
  return blog
}

const getCachedPublishedBlogBySlug = unstable_cache(
  async (slug: string) => queryPublishedBlogBySlug(slug),
  ['blog-by-slug-cache'],
  { revalidate: BLOGS_REVALIDATE_SECONDS, tags: [BLOGS_CACHE_TAG] }
)

export async function getPublishedBlogBySlug(rawSlug: string) {
  const slug = sanitizeBlogSlug(rawSlug)
  if (!slug) return null
  return getCachedPublishedBlogBySlug(slug)
}
