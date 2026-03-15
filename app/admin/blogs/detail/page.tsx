'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BlogDetail } from '@/components/admin/blogs/detail'

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
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Blog
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Blog Details</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-white/40">Loading blog details...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <BlogDetail blog={data} />
        </div>
      )}
    </div>
  )
}

export default BlogDetailPage