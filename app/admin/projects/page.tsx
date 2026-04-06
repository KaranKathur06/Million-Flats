'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SelectDropdown from '@/components/SelectDropdown'
import { formatAEDCompact } from '@/lib/pricing'
import toast, { Toaster } from 'react-hot-toast'

interface ProjectItem {
  id: string
  name: string
  slug: string
  city: string | null
  community: string | null
  startingPrice: number | null
  goldenVisa: boolean
  coverImage: string | null
  status: string
  isDeleted: boolean
  deletedAt: string | null
  archivedAt: string | null
  completionYear: number | null
  createdAt: string
  developer: { id: string; name: string; slug: string | null }
  _count: { media: number; unitTypes: number; leads: number }
}

type LifecycleFilter = 'all' | 'active' | 'archived' | 'deleted'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  ARCHIVED: 'bg-white/[0.10] text-white/60 border-white/[0.20]',
  DELETED: 'bg-red-500/15 text-red-300 border-red-500/20',
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active')
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<ProjectItem | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState<null | 'delete' | 'archive'>(null)
  const [stats, setStats] = useState({ total: 0, active: 0, archived: 0, deleted: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('lifecycle', lifecycleFilter)
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`/api/admin/projects${query}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Failed to load projects')
      setProjects(json.items || [])
      setStats(json.lifecycleStats || { total: 0, active: 0, archived: 0, deleted: 0 })
    } catch (err: any) {
      toast.error(err.message || 'Failed to load projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [lifecycleFilter, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => projects.some((p) => p.id === id)))
  }, [projects])

  const selectedCount = selectedIds.length
  const allSelectableIds = useMemo(() => projects.map((p) => p.id), [projects])
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.includes(id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (allSelected ? [] : allSelectableIds))
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return formatAEDCompact(price)
  }

  const showUndoToast = (project: ProjectItem) => {
    toast.custom((t) => (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-[#071629] px-4 py-3 text-sm text-white shadow-xl">
        <span>{project.name} deleted</span>
        <button
          className="rounded-lg border border-emerald-400/40 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/15"
          onClick={async () => {
            toast.dismiss(t.id)
            await restoreProject(project.id)
          }}
        >
          Undo
        </button>
      </div>
    ), { duration: 6000 })
  }

  const toggleStatus = async (project: ProjectItem) => {
    if (project.isDeleted) return
    setPublishing(project.id)
    try {
      const newStatus = project.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      const res = await fetch(`/api/admin/projects/${project.id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Failed to update status')
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p)))
      toast.success(`Project ${newStatus === 'PUBLISHED' ? 'published' : 'moved to draft'}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setPublishing(null)
    }
  }

  const softDeleteProject = async (project: ProjectItem) => {
    setDeleting(project.id)
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Delete failed')
      toast.success('Project deleted successfully')
      showUndoToast(project)
      setSingleDeleteTarget(null)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const restoreProject = async (projectId: string) => {
    setRestoring(projectId)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/restore`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Restore failed')
      toast.success('Project restored')
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const runBulkDelete = async () => {
    if (!selectedIds.length) return
    setBulkActionLoading('delete')
    try {
      const res = await fetch('/api/admin/projects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: selectedIds }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Bulk delete failed')
      const result = json.result || { success: [], failed: [] }
      toast.success(`Deleted ${result.success.length} project(s)`) 
      if ((result.failed || []).length) {
        toast.error(`Failed: ${result.failed.length} project(s)`)
      }
      setBulkDeleteModalOpen(false)
      setSelectedIds([])
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Bulk delete failed')
    } finally {
      setBulkActionLoading(null)
    }
  }

  const runBulkArchive = async () => {
    if (!selectedIds.length) return
    setBulkActionLoading('archive')
    try {
      const res = await fetch('/api/admin/projects/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: selectedIds }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Bulk archive failed')
      const result = json.result || { success: [], failed: [] }
      toast.success(`Archived ${result.success.length} project(s)`) 
      if ((result.failed || []).length) {
        toast.error(`Failed: ${result.failed.length} project(s)`)
      }
      setSelectedIds([])
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Bulk archive failed')
    } finally {
      setBulkActionLoading(null)
    }
  }

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ duration: 3200 }} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Projects</h1>
          <p className="mt-1 text-sm text-white/40">
            Manage developer off-plan and ready projects
            {!loading && <span className="ml-2 text-white/25">({stats.total} total)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-[170px]">
            <SelectDropdown
              label="Status"
              showLabel={false}
              dense
              variant="dark"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
          </div>

          <Link
            href="/admin/projects/bulk-import"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-all"
          >
            Bulk Import
          </Link>

          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
          >
            Add Project
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {([
          ['all', `All (${stats.total})`],
          ['active', `Active (${stats.active})`],
          ['archived', `Archived (${stats.archived})`],
          ['deleted', `Deleted (${stats.deleted})`],
        ] as Array<[LifecycleFilter, string]>).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setLifecycleFilter(value)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold tracking-wide transition ${
              lifecycleFilter === value
                ? 'border border-amber-400/40 bg-amber-400/15 text-amber-200'
                : 'border border-white/[0.10] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-100">{selectedCount} selected</p>
          <div className="flex items-center gap-2">
            <button
              onClick={runBulkArchive}
              disabled={bulkActionLoading !== null}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/20 disabled:opacity-50"
            >
              {bulkActionLoading === 'archive' ? 'Archiving...' : 'Archive'}
            </button>
            <button
              onClick={() => setBulkDeleteModalOpen(true)}
              disabled={bulkActionLoading !== null}
              className="rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center text-white/40">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-amber-400" />
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Project</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Developer</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">City</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Golden Visa</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Price</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Lifecycle</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Media</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Leads</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Created</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const lifecycleLabel = p.isDeleted ? 'DELETED' : p.status
                  const canPublishToggle = !p.isDeleted && p.status !== 'ARCHIVED'
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 accent-amber-400"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.coverImage || '/images/default-property.jpg'}
                            alt=""
                            className="h-9 w-12 rounded-lg object-cover border border-white/10 flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium text-white/90 leading-tight">{p.name}</p>
                            <p className="text-[11px] text-white/30 font-mono mt-0.5">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/60 text-xs">{p.developer.name}</td>
                      <td className="px-5 py-3 text-white/50 text-xs">{p.city || '-'}</td>
                      <td className="px-5 py-3 text-center">
                        {p.goldenVisa ? <span className="text-amber-300 text-xs font-semibold">Yes</span> : <span className="text-white/20 text-xs">-</span>}
                      </td>
                      <td className="px-5 py-3 text-white/60 text-xs font-medium">{formatPrice(p.startingPrice)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lifecycleLabel] || STATUS_COLORS.DRAFT}`}>
                          {lifecycleLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-white/40 text-xs">{p._count.media}</td>
                      <td className="px-5 py-3 text-center text-white/40 text-xs">{p._count.leads}</td>
                      <td className="px-5 py-3 text-white/40 text-xs whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/projects/${p.id}`}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/90 transition-all"
                          >
                            Edit
                          </Link>

                          {p.isDeleted ? (
                            <button
                              onClick={() => restoreProject(p.id)}
                              disabled={restoring === p.id}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              {restoring === p.id ? 'Restoring...' : 'Restore'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleStatus(p)}
                                disabled={publishing === p.id || !canPublishToggle}
                                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50 ${
                                  p.status === 'PUBLISHED'
                                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                {publishing === p.id ? '...' : p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                              </button>

                              <button
                                onClick={() => setSingleDeleteTarget(p)}
                                disabled={deleting === p.id}
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-white/50 text-sm">No projects found</p>
          <p className="text-white/30 text-xs mt-1">Adjust filters or add a new project</p>
        </div>
      )}

      {singleDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/35 bg-[#071328] p-6">
            <h3 className="text-xl font-semibold text-white">Delete Project?</h3>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              This will remove project from public listings, hide associated data, and can be restored later.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setSingleDeleteTarget(null)}
                className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => softDeleteProject(singleDeleteTarget)}
                disabled={deleting === singleDeleteTarget.id}
                className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
              >
                {deleting === singleDeleteTarget.id ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/35 bg-[#071328] p-6">
            <h3 className="text-xl font-semibold text-white">Delete Selected Projects</h3>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              This will soft-delete {selectedCount} selected project(s), remove them from public listings, and keep S3 assets intact for restore.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={runBulkDelete}
                disabled={bulkActionLoading !== null}
                className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
              >
                {bulkActionLoading === 'delete' ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
