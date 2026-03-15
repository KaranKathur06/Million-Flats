'use client'

import { useEffect, useState } from 'react'
import { BlogStats } from '@/components/admin/blogs/dashboard-stats'
import { AdminLayout } from '@/components/admin/layout'

type DashboardData = {
  blogStats?: any
  recentBlogs?: any[]
}

const DashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await fetch('/api/admin/blogs', { method: 'GET' })
      const json = await res.json().catch(() => null)

      if (!alive) return

      if (json?.success) {
        setData({
          blogStats: {
            totalBlogs: json?.pagination?.total ?? 0,
            publishedBlogs: 0,
            totalViews: 0,
            avgSeoScore: 0,
          },
          recentBlogs: (json?.data || []).slice(0, 5),
        })
      } else {
        setData({ blogStats: {}, recentBlogs: [] })
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BlogStats stats={data?.blogStats} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Blogs</h3>
          <div className="space-y-4">
            {(data?.recentBlogs?.length ?? 0) > 0 ? (
              data?.recentBlogs?.map((blog: any) => (
                <div key={blog.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{blog.title}</p>
                    <p className="text-xs text-gray-500">{blog.author.name}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(blog.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-4">
                No blogs created yet
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default DashboardPage