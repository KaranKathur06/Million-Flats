'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BlogItem {
  id: string
  title: string
  slug: string
  authorName: string
  authorEmail: string
  categoryName: string
  seoScore: number
  status: string
  publishAt?: Date | string
  createdAt?: Date | string
  views: number
  tags: string[]
}

interface AdminBlogsTableClientProps {
  items: BlogItem[]
  currentRole: string
}

export default function AdminBlogsTableClient({ items, currentRole }: AdminBlogsTableClientProps) {
  const router = useRouter()
  const [selectedBlogs, setSelectedBlogs] = useState<string[]>([])

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
        return 'bg-green-500/20 text-green-400'
      case 'DRAFT':
        return 'bg-gray-500/20 text-gray-400'
      case 'SCHEDULED':
        return 'bg-amber-500/20 text-amber-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString()
    } catch {
      return '—'
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBlogs(items.map((item) => item.id))
    } else {
      setSelectedBlogs([])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedBlogs.includes(id)) {
      setSelectedBlogs(selectedBlogs.filter((blogId) => blogId !== id))
    } else {
      setSelectedBlogs([...selectedBlogs, id])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return

    try {
      const response = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete blog')
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting blog:', error)
      alert('Failed to delete blog')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/blogs/${id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate blog')
      }

      router.refresh()
    } catch (error) {
      console.error('Error duplicating blog:', error)
      alert('Failed to duplicate blog')
    }
  }

  const handleBulkPublish = async () => {
    if (selectedBlogs.length === 0) return

    if (!confirm(`Publish ${selectedBlogs.length} selected blog(s)?`)) return

    try {
      await Promise.all(
        selectedBlogs.map((id) =>
          fetch(`/api/admin/blogs/${id}/publish`, { method: 'PATCH' })
        )
      )

      setSelectedBlogs([])
      router.refresh()
    } catch (error) {
      console.error('Error publishing blogs:', error)
      alert('Failed to publish blogs')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedBlogs.length === 0) return

    if (!confirm(`Delete ${selectedBlogs.length} selected blog(s)?`)) return

    try {
      await Promise.all(
        selectedBlogs.map((id) =>
          fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' })
        )
      )

      setSelectedBlogs([])
      router.refresh()
    } catch (error) {
      console.error('Error deleting blogs:', error)
      alert('Failed to delete blogs')
    }
  }

  return (
    <div>
      {/* Bulk Actions */}
      {selectedBlogs.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-4">
          <span className="text-sm text-amber-400">
            {selectedBlogs.length} blog(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkPublish}
              className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
            >
              Publish Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No blogs found</div>
          <Link
            href="/admin/blogs/new"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            Create your first blog →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBlogs.length === items.length && items.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  SEO Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Published
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Views
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedBlogs.includes(item.id)}
                      onChange={() => handleSelectOne(item.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/admin/blogs/${item.id}/edit`}
                        className="font-medium text-white hover:text-amber-400"
                      >
                        {item.title}
                      </Link>
                      <div className="text-xs text-white/50 truncate max-w-xs">
                        {item.tags.join(', ')}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white/80">{item.authorName}</div>
                    <div className="text-xs text-white/50">{item.authorEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${getSEOScoreColor(item.seoScore)}`}>
                      {item.seoScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70">
                    {formatDate(item.publishAt || item.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/70">
                    {item.views}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/blogs/${item.id}/edit`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDuplicate(item.id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}