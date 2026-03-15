'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlogTable } from '@/components/admin/blogs/table'
import { BlogFilter } from '@/components/admin/blogs/filter'
import { AdminLayout } from '@/components/admin/layout'

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
    <AdminLayout title="Manage Blogs">
      <div className="space-y-6">
        <BlogFilter currentFilters={{ category, status, author }} />

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

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Total {data?.pagination?.total || 0} blogs
          </div>
          <div className="flex space-x-2">
            {Array.from({ length: data?.pagination?.totalPages || 1 }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                className={`px-3 py-1 rounded ${data?.pagination?.page === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default BlogListPage