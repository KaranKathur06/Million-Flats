'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type BlogItem = {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  readTimeMinutes: number
  createdAt: string
  category: { id: string; name: string; slug: string } | null
}

type CategoryFilter = {
  slug: string
  name: string
  count: number
}

type BlogsApiResponse = {
  success: boolean
  data: BlogItem[]
  featured: BlogItem[]
  filters: {
    categories: CategoryFilter[]
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const PAGE_LIMIT = 10

function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-gray-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
        <div className="h-5 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  )
}

export default function BlogsClient() {
  const [items, setItems] = useState<BlogItem[]>([])
  const [featured, setFeatured] = useState<BlogItem[]>([])
  const [categories, setCategories] = useState<CategoryFilter[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const controller = new AbortController()

    async function loadBlogs() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(PAGE_LIMIT))
        if (debouncedQuery) params.set('search', debouncedQuery)
        if (category) params.set('category', category)

        const res = await fetch(`/api/blogs?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load blogs')

        const json: BlogsApiResponse = await res.json()
        setItems(Array.isArray(json.data) ? json.data : [])
        setFeatured(Array.isArray(json.featured) ? json.featured : [])
        setCategories(Array.isArray(json.filters?.categories) ? json.filters.categories : [])
        setTotalPages(Math.max(1, Number(json.pagination?.totalPages || 1)))
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          setItems([])
          setFeatured([])
          setCategories([])
          setTotalPages(1)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadBlogs()

    return () => controller.abort()
  }, [debouncedQuery, category, page])

  const showFeatured = useMemo(() => page === 1 && !debouncedQuery && !category && featured.length > 0, [page, debouncedQuery, category, featured.length])

  return (
    <main className="min-h-screen bg-white py-8 sm:py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategory('')
                  setPage(1)
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${!category ? 'bg-dark-blue text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                All
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    setCategory(cat.slug)
                    setPage(1)
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${category === cat.slug ? 'bg-dark-blue text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {showFeatured ? (
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {featured.slice(0, 2).map((post) => (
              <Link
                key={post.id}
                href={`/blogs/${post.slug}`}
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

        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <BlogCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
              <p className="text-lg font-semibold text-dark-blue">No blogs found</p>
              <p className="mt-2 text-sm text-gray-600">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blogs/${blog.slug}`}
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
            </div>
          )}
        </section>

        <section className="mt-8 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </section>
      </div>
    </main>
  )
}
