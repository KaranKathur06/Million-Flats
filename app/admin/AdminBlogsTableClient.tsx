'use client'

import { useState, useEffect } from 'react'
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

// ─── Toast ───────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl ${
        type === 'success'
          ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300'
          : 'bg-red-500/15 border-red-400/25 text-red-300'
      }`}>
        {type === 'success' ? (
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

// ─── Confirmation Modal ──────────────────────────────────
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#050a12]/75 backdrop-blur-[3px]"
        onClick={() => !isLoading && onCancel()}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0b1220]/95 p-6 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-500/80 via-red-400/60 to-red-500/80" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-red-400/35 bg-red-500/15 text-red-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-white/70">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500/25 border border-red-400/40 hover:bg-red-500/35 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminBlogsTableClient({ items, currentRole }: AdminBlogsTableClientProps) {
  const router = useRouter()
  const [blogItems, setBlogItems] = useState<BlogItem[]>(items)
  const [selectedBlogs, setSelectedBlogs] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BlogItem | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    setBlogItems(items)
  }, [items])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
        return {
          bg: 'bg-gradient-to-r from-emerald-500/20 to-green-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-400/25',
          glow: 'shadow-emerald-500/10',
          dot: 'bg-emerald-400',
        }
      case 'DRAFT':
        return {
          bg: 'bg-gradient-to-r from-slate-500/20 to-gray-500/15',
          text: 'text-slate-300',
          border: 'border-slate-400/20',
          glow: '',
          dot: 'bg-slate-400',
        }
      case 'SCHEDULED':
        return {
          bg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/15',
          text: 'text-amber-300',
          border: 'border-amber-400/25',
          glow: 'shadow-amber-500/10',
          dot: 'bg-amber-400',
        }
      default:
        return {
          bg: 'bg-white/[0.06]',
          text: 'text-white/50',
          border: 'border-white/[0.08]',
          glow: '',
          dot: 'bg-white/40',
        }
    }
  }

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400' }
    if (score >= 50) return { text: 'text-amber-400', ring: 'ring-amber-400/30', bg: 'bg-amber-400' }
    return { text: 'text-red-400', ring: 'ring-red-400/30', bg: 'bg-red-400' }
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return '—'
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return '—'
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBlogs(blogItems.map((item) => item.id))
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/blogs/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to delete blog')
      setBlogItems((prev) => prev.filter((it) => it.id !== deleteTarget.id))
      setSelectedBlogs((prev) => prev.filter((id) => id !== deleteTarget.id))
      showToast(`"${deleteTarget.title}" deleted successfully`, 'success')
      router.refresh()
    } catch (error) {
      console.error('Error deleting blog:', error)
      showToast(error instanceof Error ? error.message : 'Failed to delete blog', 'error')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleDuplicate = async (item: BlogItem) => {
    setActionLoading(`dup-${item.id}`)
    try {
      const response = await fetch(`/api/admin/blogs/${item.id}/duplicate`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to duplicate blog')
      showToast(`"${item.title}" duplicated`, 'success')
      router.refresh()
    } catch (error) {
      console.error('Error duplicating blog:', error)
      showToast('Failed to duplicate blog', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkPublish = async () => {
    if (selectedBlogs.length === 0) return

    setActionLoading('bulk-publish')
    try {
      await Promise.all(
        selectedBlogs.map((id) =>
          fetch(`/api/admin/blogs/${id}/publish`, { method: 'PATCH' })
        )
      )
      showToast(`${selectedBlogs.length} blog(s) published`, 'success')
      setSelectedBlogs([])
      router.refresh()
    } catch (error) {
      console.error('Error publishing blogs:', error)
      showToast('Failed to publish blogs', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const executeBulkDelete = async () => {
    if (selectedBlogs.length === 0) {
      showToast('No blogs selected', 'error')
      return
    }
    setActionLoading('bulk-delete')
    try {
      const response = await fetch('/api/admin/blogs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBlogs }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete selected blogs')
      }
      const deletedIds: string[] = Array.isArray(data?.deletedIds) ? data.deletedIds : []
      setBlogItems((prev) => prev.filter((it) => !deletedIds.includes(it.id)))
      const skipped = data.skippedCount || 0
      const msg = skipped > 0
        ? `${data.deletedCount || deletedIds.length} blog(s) deleted, ${skipped} skipped`
        : `${data.deletedCount || deletedIds.length} blog(s) deleted`
      showToast(msg, 'success')
      setSelectedBlogs([])
      setBulkDeleteOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error deleting blogs:', error)
      showToast(error instanceof Error ? error.message : 'Failed to delete blogs', 'error')
      setBulkDeleteOpen(false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedBlogs.length === 0) {
      showToast('No blogs selected', 'error')
      return
    }
    setBulkDeleteOpen(true)
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .blog-table-scroll::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .blog-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .blog-table-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .blog-table-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      <div>
        {/* Bulk Actions Bar */}
        {selectedBlogs.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-400/20 rounded-xl flex items-center justify-between gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-300">{selectedBlogs.length}</span>
              </div>
              <span className="text-sm font-semibold text-amber-200/80">
                blog{selectedBlogs.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkPublish}
                disabled={actionLoading === 'bulk-publish'}
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-500/15 text-emerald-300 rounded-lg border border-emerald-400/20 hover:bg-emerald-500/25 transition-all duration-200 font-semibold disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </button>
              <button
                onClick={handleBulkDeleteClick}
                disabled={actionLoading === 'bulk-delete'}
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-red-500/15 text-red-300 rounded-lg border border-red-400/20 hover:bg-red-500/25 transition-all duration-200 font-semibold disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={() => setSelectedBlogs([])}
                className="text-xs px-3 py-2 text-white/40 hover:text-white/60 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {blogItems.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white/60 mb-2">No blogs yet</h3>
            <p className="text-sm text-white/30 mb-6 max-w-sm mx-auto">
              Start creating content to engage your audience and drive organic traffic.
            </p>
            <Link
              href="/admin/blogs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first blog
            </Link>
          </div>
        ) : (
          /* ─── Premium Table ─── */
          <div className="overflow-x-auto blog-table-scroll">
            <table className="min-w-full">
              {/* Sticky Header */}
              <thead>
                <tr className="sticky top-0 z-10 bg-[#0b1220]/95 backdrop-blur-md border-b border-white/[0.08]">
                  <th className="px-4 py-3.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedBlogs.length === blogItems.length && blogItems.length > 0}
                      onChange={handleSelectAll}
                      className="accent-amber-400 w-4 h-4 rounded-md cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Title
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Category
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Author
                  </th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-white/40">
                    SEO
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Date
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Views
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {blogItems.map((item, idx) => {
                  const statusCfg = getStatusConfig(item.status)
                  const seoCfg = getSEOScoreColor(item.seoScore)

                  return (
                    <tr
                      key={item.id}
                      className={`group border-b border-white/[0.04] transition-all duration-200 hover:bg-white/[0.03] hover:border-white/[0.08] ${
                        selectedBlogs.includes(item.id) ? 'bg-amber-400/[0.04]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBlogs.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                          className="accent-amber-400 w-4 h-4 rounded-md cursor-pointer"
                        />
                      </td>

                      {/* Title + Tags */}
                      <td className="px-4 py-4 max-w-xs">
                        <Link
                          href={`/admin/blogs/${item.id}/edit`}
                          className="block group/title"
                        >
                          <span className="text-sm font-semibold text-white/90 group-hover/title:text-amber-300 transition-colors duration-200 line-clamp-1">
                            {item.title}
                          </span>
                        </Link>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30 border border-white/[0.04]"
                              >
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-[10px] text-white/20">+{item.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-lg bg-blue-500/10 text-blue-300/80 border border-blue-400/15 font-medium">
                          {item.categoryName}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-white/10 to-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/50 flex-shrink-0">
                            {item.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white/75 truncate">{item.authorName}</p>
                          </div>
                        </div>
                      </td>

                      {/* SEO Score */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <div className={`relative h-9 w-9 rounded-full flex items-center justify-center ring-2 ${seoCfg.ring}`}>
                            <span className={`text-xs font-bold ${seoCfg.text}`}>{item.seoScore}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-lg border shadow-sm ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} ${statusCfg.glow}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {item.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-white/50">{formatDate(item.publishAt || item.createdAt)}</span>
                      </td>

                      {/* Views */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-white/50 tabular-nums">
                          {item.views.toLocaleString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {/* Edit */}
                          <Link
                            href={`/admin/blogs/${item.id}/edit`}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-amber-300 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/20 transition-all duration-200"
                            title="Edit"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(item)}
                            disabled={actionLoading === `dup-${item.id}`}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-blue-300 hover:bg-blue-400/10 border border-transparent hover:border-blue-400/20 transition-all duration-200 disabled:opacity-50"
                            title="Duplicate"
                          >
                            {actionLoading === `dup-${item.id}` ? (
                              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-400/20 transition-all duration-200"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Blog"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Delete Selected Blogs"
        message={`Are you sure you want to delete ${selectedBlogs.length} selected blog(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedBlogs.length} Blog(s)`}
        onConfirm={executeBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        isLoading={actionLoading === 'bulk-delete'}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
