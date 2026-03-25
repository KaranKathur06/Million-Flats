import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = {
  title: 'Blog - MillionFlats | Real Estate Insights & Market Updates',
  description: 'Expert insights on Dubai real estate, investment strategies, market trends, and property guides from the MillionFlats team.',
}

async function getPublishedBlogs() {
  try {
    const blogs = await (prisma as any).blog.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImageUrl: true,
        featuredImageAlt: true,
        readTimeMinutes: true,
        views: true,
        createdAt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
        tags: {
          include: { tag: { select: { name: true, slug: true } } },
        },
      },
    })

    return (blogs as any[]).map((blog: any) => ({
      ...blog,
      tags: blog.tags?.map((bt: any) => bt.tag) || [],
    }))
  } catch {
    return []
  }
}

async function getCategories() {
  try {
    return await (prisma as any).category.findMany({
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        _count: { select: { blogs: { where: { status: 'PUBLISHED' } } } },
      },
    })
  } catch {
    return []
  }
}

export default async function BlogPage() {
  const [blogs, categories] = await Promise.all([
    getPublishedBlogs(),
    getCategories(),
  ])

  const featuredBlog = blogs[0]
  const remainingBlogs = blogs.slice(1)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Blog</h1>
            <p className="mt-4 text-lg text-gray-600">
              Insights, market updates, and guides from the MillionFlats team.
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <Link
                href="/blog"
                className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-dark-blue text-white transition-colors"
              >
                All Posts
              </Link>
              {(categories as any[]).map((cat: any) => (
                <Link
                  key={cat.slug}
                  href={`/blog?category=${cat.slug}`}
                  className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-dark-blue transition-colors"
                >
                  {cat.name}
                  {cat._count?.blogs > 0 && (
                    <span className="ml-1.5 text-xs text-gray-400">({cat._count.blogs})</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Content */}
      {blogs.length === 0 ? (
        <section className="bg-white">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10">
              <div className="text-sm font-semibold text-dark-blue">Coming Soon</div>
              <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                A professional blog experience is on the way.
              </div>
              <div className="mt-3 text-gray-600">
                We are preparing high-quality articles on Dubai real estate, investment strategy, and platform updates.
              </div>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
                >
                  Contact Us
                </a>
                <a
                  href="/"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10">
            {/* Featured Blog (first post) */}
            {featuredBlog && (
              <Link href={`/blog/${featuredBlog.slug}`} className="group block mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {featuredBlog.featuredImageUrl ? (
                    <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                      <img
                        src={featuredBlog.featuredImageUrl}
                        alt={featuredBlog.featuredImageAlt || featuredBlog.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] lg:aspect-auto bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <svg className="h-16 w-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-dark-blue bg-blue-50 px-3 py-1 rounded-full">
                        {featuredBlog.category?.name}
                      </span>
                      <span className="text-xs text-gray-400">{featuredBlog.readTimeMinutes} min read</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 group-hover:text-dark-blue transition-colors">
                      {featuredBlog.title}
                    </h2>
                    <p className="mt-3 text-gray-600 line-clamp-3">{featuredBlog.excerpt}</p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-dark-blue text-white flex items-center justify-center text-xs font-bold">
                        {featuredBlog.author?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{featuredBlog.author?.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(featuredBlog.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Blog Grid */}
            {remainingBlogs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {remainingBlogs.map((blog: any) => (
                  <Link
                    key={blog.id}
                    href={`/blog/${blog.slug}`}
                    className="group block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all"
                  >
                    {blog.featuredImageUrl ? (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={blog.featuredImageUrl}
                          alt={blog.featuredImageAlt || blog.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        <svg className="h-10 w-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold text-dark-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
                          {blog.category?.name}
                        </span>
                        <span className="text-[11px] text-gray-400">{blog.readTimeMinutes} min</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-dark-blue transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{blog.excerpt}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                        <span>{blog.author?.name}</span>
                        <span>
                          {new Date(blog.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
