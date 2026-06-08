'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlogTable } from '@/components/admin/blogs/table'
import { BlogFilter } from '@/components/admin/blogs/filter'

type ApiBlogsResponse = {
  success: boolean
  data?: any[]
  pagination?: { page: number; total: number; totalPages: number }
}

const BlogListPage = () => {
  const router = useRouter()
  const sp = useSearchParams()

  const page = sp?.get('page') || '1'
  const category = sp?.get('category') || ''
  const status = sp?.get('status') || ''
  const author = sp?.get('author') || ''
  const search = sp?.get('search') || ''

  const [data, setData] = useState<ApiBlogsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (page) p.set('page', page)
    if (category) p.set('category', category)
    if (status) p.set('status', status)
    if (author) p.set('author', author)
    if (search) p.set('search', search)
    return p.toString()
  }, [page, category, status, author, search])

  useEffect(() => {
    let alive = true
    setIsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/blogs?${qs}`)
        const json = (await res.json().catch(() => null)) as ApiBlogsResponse | null
        if (!alive) return
        setData(json)
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [qs])

  const goToPage = (nextPage: number) => {
    const p = new URLSearchParams(qs)
    p.set('page', String(nextPage))
    router.push(`/admin/blogs/list?${p.toString()}`)
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Manage Blogs</h1>
          <p className="mt-1 text-sm text-white/50">List and manage all blog posts</p>
        </div>
      </div>

      <div className="space-y-6">
        <BlogFilter currentFilters={{ category, status, author }} />

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <BlogTable
            blogs={data?.data || []}
            isLoading={isLoading}
            onEdit={(id) => router.push(`/admin/blogs/${id}/edit`)}
            onDelete={async (id) => {
              if (!confirm('Are you sure you want to delete this blog?')) return
              await fetch(`/api/admin/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' })
              router.refresh()
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-white/40">
            Total <span className="text-white/70 font-semibold">{data?.pagination?.total || 0}</span> blogs
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: data?.pagination?.totalPages || 1 }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                className={`h-8 min-w-[32px] px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  data?.pagination?.page === i + 1
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlogListPage