'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SelectDropdown from '@/components/SelectDropdown'
import ProjectActionsMenu from '@/components/admin/ProjectActionsMenu'
import ProjectDetailsDrawer from '@/components/admin/ProjectDetailsDrawer'
import { AdminBulkToolbar, AdminFilterChips } from '@/components/admin/workspace'
import { AdminDataCard, ResponsiveDataTable } from '@/components/responsive'
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

function TableSkeletonRows() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="divide-y divide-white/[0.04]">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3">
            <div className="col-span-1 h-5 rounded bg-white/[0.06] animate-pulse" />
            <div className="col-span-4 h-5 rounded bg-white/[0.06] animate-pulse" />
            <div className="col-span-2 h-5 rounded bg-white/[0.06] animate-pulse" />
            <div className="col-span-2 h-5 rounded bg-white/[0.06] animate-pulse" />
            <div className="col-span-3 h-5 rounded bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active')
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<ProjectItem | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState<null | 'delete' | 'archive' | 'publish' | 'unpublish'>(null)
  const [cityFilter, setCityFilter] = useState('')
  const [developerFilter, setDeveloperFilter] = useState('')
  const [detailsProject, setDetailsProject] = useState<ProjectItem | null>(null)
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

  const cityOptions = useMemo(() => {
    const cities = new Set<string>()
    for (const p of projects) {
      if (p.city?.trim()) cities.add(p.city.trim())
    }
    return Array.from(cities).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const developerOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const p of projects) {
      names.set(p.developer.id, p.developer.name)
    }
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (cityFilter && (p.city || '').trim() !== cityFilter) return false
      if (developerFilter && p.developer.id !== developerFilter) return false
      return true
    })
  }, [projects, cityFilter, developerFilter])

  const selectedCount = selectedIds.length
  const allSelectableIds = useMemo(() => filteredProjects.map((p) => p.id), [filteredProjects])
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
        <span className="truncate max-w-[240px]">{project.name} deleted</span>
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

  const archiveProject = async (project: ProjectItem) => {
    if (project.isDeleted) return
    setArchiving(project.id)
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Archive failed')
      toast.success('Project archived')
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Archive failed')
    } finally {
      setArchiving(null)
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

  const runBulkPublish = async (action: 'publish' | 'unpublish') => {
    if (!selectedIds.length) return
    setBulkActionLoading(action === 'publish' ? 'publish' : 'unpublish')
    try {
      const res = await fetch('/api/admin/projects/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: selectedIds, action }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Bulk update failed')
      const result = json.result || { success: [], failed: [] }
      toast.success(`${action === 'publish' ? 'Published' : 'Unpublished'} ${result.success.length} project(s)`)
      if ((result.failed || []).length) {
        toast.error(`Failed: ${result.failed.length} project(s)`)
      }
      setSelectedIds([])
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Bulk update failed')
    } finally {
      setBulkActionLoading(null)
    }
  }

  const exportProjectsCsv = (rows: ProjectItem[]) => {
    const header = ['Name', 'Slug', 'Developer', 'City', 'Status', 'Price AED', 'Leads', 'Media', 'Created']
    const lines = rows.map((p) => {
      const lifecycle = p.isDeleted ? 'DELETED' : p.status
      const price = p.startingPrice != null ? String(p.startingPrice) : ''
      const created = new Date(p.createdAt).toISOString().slice(0, 10)
      return [
        p.name,
        p.slug,
        p.developer.name,
        p.city || '',
        lifecycle,
        price,
        String(p._count.leads),
        String(p._count.media),
        created,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `millionflats-projects-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} project(s)`)
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

  const openDetails = (p: ProjectItem) => setDetailsProject(p)

  const renderRowActions = (p: ProjectItem) => (
    <ProjectActionsMenu
      projectId={p.id}
      slug={p.slug}
      projectName={p.name}
      status={p.status}
      isDeleted={p.isDeleted}
      canPublishToggle={!p.isDeleted && p.status !== 'ARCHIVED'}
      publishing={publishing === p.id}
      deleting={deleting === p.id}
      restoring={restoring === p.id}
      archiving={archiving === p.id}
      onPublishToggle={() => toggleStatus(p)}
      onArchive={() => archiveProject(p)}
      onDelete={() => setSingleDeleteTarget(p)}
      onRestore={() => restoreProject(p.id)}
    />
  )

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ duration: 3200 }} />

      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Projects</h1>
          <p className="mt-1 text-sm text-white/40">
            Manage developer off-plan and ready projects
            {!loading && <span className="ml-2 text-white/25">({stats.total} total)</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

          <Link href="/admin/projects/bulk-import" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-all">
            Bulk Import
          </Link>

          <Link href="/admin/projects/new" className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20">
            Add Project
          </Link>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <AdminFilterChips
          chips={[
            { value: 'all', label: 'All', count: stats.total },
            { value: 'active', label: 'Active', count: stats.active },
            { value: 'archived', label: 'Archived', count: stats.archived },
            { value: 'deleted', label: 'Deleted', count: stats.deleted },
          ]}
          value={lifecycleFilter}
          onChange={(v) => setLifecycleFilter(v as LifecycleFilter)}
        />
        <AdminFilterChips
          size="sm"
          chips={[
            { value: '', label: 'Any status' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {(cityOptions.length > 0 || developerOptions.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {cityOptions.length > 0 ? (
              <AdminFilterChips
                size="sm"
                chips={[{ value: '', label: 'All cities' }, ...cityOptions.map((c) => ({ value: c, label: c }))]}
                value={cityFilter}
                onChange={setCityFilter}
              />
            ) : null}
            {developerOptions.length > 1 ? (
              <AdminFilterChips
                size="sm"
                chips={[
                  { value: '', label: 'All developers' },
                  ...developerOptions.map(([id, name]) => ({ value: id, label: name })),
                ]}
                value={developerFilter}
                onChange={setDeveloperFilter}
              />
            ) : null}
          </div>
        )}
      </div>

      <AdminBulkToolbar
        selectedCount={selectedCount}
        entityLabel="project"
        onClear={() => setSelectedIds([])}
        actions={[
          {
            key: 'publish',
            label: bulkActionLoading === 'publish' ? 'Publishing…' : 'Publish',
            variant: 'primary',
            disabled: bulkActionLoading !== null,
            onClick: () => runBulkPublish('publish'),
          },
          {
            key: 'unpublish',
            label: bulkActionLoading === 'unpublish' ? 'Unpublishing…' : 'Unpublish',
            disabled: bulkActionLoading !== null,
            onClick: () => runBulkPublish('unpublish'),
          },
          {
            key: 'archive',
            label: bulkActionLoading === 'archive' ? 'Archiving…' : 'Archive',
            disabled: bulkActionLoading !== null,
            onClick: runBulkArchive,
          },
          {
            key: 'export',
            label: 'Export CSV',
            disabled: bulkActionLoading !== null,
            onClick: () => exportProjectsCsv(filteredProjects.filter((p) => selectedIds.includes(p.id))),
          },
          {
            key: 'delete',
            label: 'Delete',
            variant: 'danger',
            disabled: bulkActionLoading !== null,
            onClick: () => setBulkDeleteModalOpen(true),
          },
        ]}
      />

      {loading && <TableSkeletonRows />}

      {!loading && filteredProjects.length > 0 && (
        <ResponsiveDataTable
          mobileCards={filteredProjects.map((p) => {
            const lifecycleLabel = p.isDeleted ? 'DELETED' : p.status
            return (
              <AdminDataCard
                key={p.id}
                selected={selectedIds.includes(p.id)}
                onSelect={() => toggleSelect(p.id)}
                leading={
                  <img
                    src={p.coverImage || '/images/default-property.jpg'}
                    alt=""
                    className="h-12 w-16 rounded-lg border border-white/10 object-cover"
                  />
                }
                title={
                  <button type="button" onClick={() => openDetails(p)} className="text-left font-semibold text-white/90 hover:text-amber-200">
                    {p.name}
                  </button>
                }
                subtitle={p.slug}
                status={
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lifecycleLabel] || STATUS_COLORS.DRAFT}`}>
                    {lifecycleLabel}
                  </span>
                }
                meta={
                  <>
                    <p><span className="text-white/35">Developer:</span> {p.developer.name}</p>
                    <p><span className="text-white/35">City:</span> {p.city || '—'}</p>
                    <p><span className="text-white/35">Price:</span> {formatPrice(p.startingPrice)}</p>
                    <p><span className="text-white/35">Media / Leads:</span> {p._count.media} / {p._count.leads}</p>
                  </>
                }
                actions={renderRowActions(p)}
              />
            )
          })}
          table={
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-20 bg-[#0b1a2b]">
              <tr className="border-b border-white/[0.08]">
                <th className="w-10 px-2 py-3.5 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-amber-400" />
                </th>
                <th className="min-w-[200px] px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">Project</th>
                <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">Developer</th>
                <th className="px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">City</th>
                <th className="hidden md:table-cell px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-white/30">Golden Visa</th>
                <th className="hidden md:table-cell px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">Price</th>
                <th className="px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-white/30">Status</th>
                <th className="hidden lg:table-cell px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-white/30">Media</th>
                <th className="hidden lg:table-cell px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-white/30">Leads</th>
                <th className="hidden xl:table-cell px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-white/30">Created</th>
                <th className="w-12 px-2 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-white/30" />
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const lifecycleLabel = p.isDeleted ? 'DELETED' : p.status
                return (
                  <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                    <td className="w-10 px-2 py-3 align-middle">
                      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 accent-amber-400" />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="admin-project-name-cell project-cell flex min-w-0 max-w-[220px] items-center gap-2.5">
                        <img src={p.coverImage || '/images/default-property.jpg'} alt="" className="h-9 w-12 rounded-lg border border-white/10 object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => openDetails(p)}
                            className="admin-project-name project-name truncate text-left text-sm font-medium leading-[1.2] text-white/90 hover:text-amber-200 lg:pointer-events-none"
                          >
                            {p.name}
                          </button>
                          <p className="project-slug truncate text-[11px] font-mono opacity-60">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="block truncate text-xs text-white/65">{p.developer.name}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="block truncate text-xs text-white/55">{p.city || '-'}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3 text-center align-middle">
                      {p.goldenVisa ? <span className="text-amber-300 text-xs font-semibold">Yes</span> : <span className="text-white/25 text-xs">-</span>}
                    </td>
                    <td className="hidden md:table-cell px-3 py-3 align-middle">
                      <span className="truncate text-xs font-medium text-white/65">{formatPrice(p.startingPrice)}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lifecycleLabel] || STATUS_COLORS.DRAFT}`}>
                        {lifecycleLabel}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-3 py-3 text-center align-middle text-xs text-white/45">{p._count.media}</td>
                    <td className="hidden lg:table-cell px-3 py-3 text-center align-middle text-xs text-white/45">{p._count.leads}</td>
                    <td className="hidden xl:table-cell px-3 py-3 align-middle text-xs text-white/45 truncate">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="w-12 px-2 py-3 text-right align-middle">
                      {renderRowActions(p)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
          }
        />
      )}

      <ProjectDetailsDrawer
        open={!!detailsProject}
        project={
          detailsProject
            ? {
                name: detailsProject.name,
                slug: detailsProject.slug,
                developerName: detailsProject.developer.name,
                city: detailsProject.city,
                status: detailsProject.isDeleted ? 'DELETED' : detailsProject.status,
                startingPrice: formatPrice(detailsProject.startingPrice),
                mediaCount: detailsProject._count.media,
                leadsCount: detailsProject._count.leads,
                createdAt: new Date(detailsProject.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                goldenVisa: detailsProject.goldenVisa,
              }
            : null
        }
        onClose={() => setDetailsProject(null)}
      />

      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-white/50 text-sm">No projects match the selected filters</p>
          <button
            type="button"
            onClick={() => {
              setCityFilter('')
              setDeveloperFilter('')
            }}
            className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200"
          >
            Clear filters
          </button>
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
              <button onClick={() => setSingleDeleteTarget(null)} className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10">
                Cancel
              </button>
              <button onClick={() => softDeleteProject(singleDeleteTarget)} disabled={deleting === singleDeleteTarget.id} className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50">
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
              <button onClick={() => setBulkDeleteModalOpen(false)} className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10">
                Cancel
              </button>
              <button onClick={runBulkDelete} disabled={bulkActionLoading !== null} className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50">
                {bulkActionLoading === 'delete' ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
