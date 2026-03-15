'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BlogDetail } from '@/components/admin/blogs/detail'
import { AdminLayout } from '@/components/admin/layout'

const BlogDetailPage = () => {
  const searchParams = useSearchParams()
  const id = searchParams?.get('id')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (!id) {
          if (alive) {
            setData(null)
            setIsLoading(false)
          }
          return
        }

        const res = await fetch(`/api/admin/blogs/${encodeURIComponent(id)}`)
        const json = await res.json().catch(() => null)
        if (!alive) return
        setData(json?.data ?? null)
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  return (
    <AdminLayout title="Blog Details">
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <BlogDetail blog={data} />
      )}
    </AdminLayout>
  )
}

export default BlogDetailPage