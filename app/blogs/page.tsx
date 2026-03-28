import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blogs | MillionFlats',
  description:
    'Read MillionFlats real estate insights, market updates, investment guides, and practical property intelligence.',
}

type BlogsPageProps = {
  searchParams?: {
    category?: string
    tag?: string
    search?: string
  }
}

async function getPublishedBlogs(filters: BlogsPageProps['searchParams']) {
  const now = new Date()
  const category = String(filters?.category || '').trim()
  const tag = String(filters?.tag || '').trim()
  const search = String(filters?.search || '').trim()

  const where: any = {
    status: 'PUBLISHED',
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
  }

  if (category) where.category = { slug: category }
  if (tag) where.tags = { some: { tag: { slug: tag } } }
  if (search) {
    where.AND = [
      {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      },
    ]
  }

  const blogs = await (prisma as any).blog.findMany({
    where,
    orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      category: true,
      author: true,
    },
    take: 60,
  })

  return blogs
}

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const blogs = await getPublishedBlogs(searchParams)

  return (
    <main className="min-h-screen bg-white py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-dark-blue sm:text-4xl">MillionFlats Blog</h1>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            Market intelligence, legal awareness, investment ideas, and property trends from the MillionFlats team.
          </p>
        </header>

        {blogs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center sm:p-10">
            <h2 className="text-xl font-semibold text-dark-blue">No published blogs yet</h2>
            <p className="mt-2 text-sm text-gray-600">Published posts will appear here automatically from the admin CMS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog: any) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.slug}`}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                  {blog.featuredImageUrl ? (
                    <img
                      src={blog.featuredImageUrl}
                      alt={blog.featuredImageAlt || blog.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No Image</div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-700">
                      {blog.category?.name || 'General'}
                    </span>
                    <span>{blog.readTimeMinutes || 1} min read</span>
                  </div>
                  <h2 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-dark-blue">{blog.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{blog.excerpt || 'Read the full insight on MillionFlats.'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

