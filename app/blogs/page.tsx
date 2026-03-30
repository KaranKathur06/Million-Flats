import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPublicBlogsData } from '@/lib/blogs/public'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blogs | MillionFlats',
  description:
    'Read MillionFlats real estate insights, market updates, investment guides, and practical property intelligence.',
}

type BlogPageProps = {
  searchParams?: {
    search?: string
    category?: string
    page?: string
  }
}

const LIMIT = 10

function withParams(params: { search?: string; category?: string; page?: number }) {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.category) q.set('category', params.category)
  if (params.page && params.page > 1) q.set('page', String(params.page))
  const text = q.toString()
  return text ? `/blogs?${text}` : '/blogs'
}

export default async function BlogsPage({ searchParams }: BlogPageProps) {
  const data = await getPublicBlogsData(searchParams, LIMIT).catch(() => ({
    blogs: [],
    featured: [],
    categories: [],
    total: 0,
    page: 1,
    limit: LIMIT,
    search: '',
    category: '',
    totalPages: 1,
  }))

  return (
    <main className="min-h-screen bg-white py-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <form action="/blogs" method="get" className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <input
                name="search"
                defaultValue={data.search}
                placeholder="Search insights, market trends, and guides..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-800 outline-none transition focus:border-primary-500"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
            </div>
            <button
              type="submit"
              className="h-12 rounded-xl bg-dark-blue px-5 text-sm font-semibold text-white transition hover:bg-dark-blue/90"
            >
              Search
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={withParams({ search: data.search, page: 1 })}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${!data.category ? 'bg-dark-blue text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
            >
              All
            </Link>
            {data.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={withParams({ search: data.search, category: cat.slug, page: 1 })}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${data.category === cat.slug ? 'bg-dark-blue text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>

        {data.featured.length > 0 ? (
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.featured.map((post) => (
              <Link
                key={post.id}
                href={`/blogs/${post.slug}`}
                prefetch={true}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                  {post.featuredImageUrl ? (
                    <Image
                      src={post.featuredImageUrl}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Featured</p>
                  <h2 className="mt-2 line-clamp-2 text-xl font-bold text-dark-blue">{post.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        {data.blogs.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-lg font-semibold text-dark-blue">No blogs found</p>
            <p className="mt-2 text-sm text-gray-600">Try adjusting your search or category filter.</p>
          </section>
        ) : (
          <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.blogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.slug}`}
                prefetch={true}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  {blog.featuredImageUrl ? (
                    <Image
                      src={blog.featuredImageUrl}
                      alt={blog.featuredImageAlt || blog.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-700">
                      {blog.category?.name || 'General'}
                    </span>
                    <span>{blog.readTimeMinutes || 1} min read</span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-dark-blue">{blog.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{blog.excerpt || 'Read the full insight on MillionFlats.'}</p>
                </div>
              </Link>
            ))}
          </section>
        )}

        <section className="mt-8 flex items-center justify-center gap-2">
          <Link
            href={withParams({ search: data.search, category: data.category, page: Math.max(1, data.page - 1) })}
            prefetch={true}
            className={`h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 ${data.page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            Previous
          </Link>
          <span className="px-3 text-sm text-gray-500">Page {data.page} of {data.totalPages}</span>
          <Link
            href={withParams({ search: data.search, category: data.category, page: Math.min(data.totalPages, data.page + 1) })}
            prefetch={true}
            className={`h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 ${data.page >= data.totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            Next
          </Link>
        </section>
      </div>
    </main>
  )
}


