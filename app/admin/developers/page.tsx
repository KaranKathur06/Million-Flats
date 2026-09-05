'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CountryFilter, EntityIdentityCell, LifecycleBadge, LifecycleTabs, ManagementEmptyState, ManagementMetricCards } from '@/components/admin/management/ManagementPrimitives'

type FilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'

interface Developer {
  id: string
  name: string
  slug: string | null
  logo: string | null
  banner: string | null
  countryCode: string
  countryIso2: string | null
  city: string | null
  shortDescription: string | null
  website: string | null
  foundedYear: number | null
  isFeatured: boolean
  featuredRank: number | null
  status: string
  isDeleted?: boolean
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
  _count: { projects: number; properties: number }
}

interface DeveloperCounts {
  total: number
  active: number
  inactive: number
  deleted: number
}

function DeleteLifecycleModal({
  isOpen,
  developer,
  onSoftDelete,
  onHardDelete,
  onCancel,
  loading,
}: {
  isOpen: boolean
  developer: Developer | null
  onSoftDelete: () => void
  onHardDelete: () => void
  onCancel: () => void
  loading: 'soft' | 'hard' | null
}) {
  if (!isOpen || !developer) return null

  const alreadyDeleted = !!developer.isDeleted

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050a12]/75 backdrop-blur-[3px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0b1220]/95 p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-500/80 via-red-400/60 to-red-500/80" />

        <h3 className="text-lg font-bold text-white">Delete Developer</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Choose delete mode for <span className="font-semibold text-white">{developer.name}</span>.
        </p>
        <p className="mt-2 text-xs text-white/45">
          Soft delete hides it from platform. Permanent delete removes it from database and cannot be restored.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2">
          <button
            onClick={onSoftDelete}
            disabled={alreadyDeleted || loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {loading === 'soft' ? 'Soft Deleting...' : alreadyDeleted ? 'Already Soft Deleted' : 'Soft Delete'}
          </button>

          <button
            onClick={onHardDelete}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
          >
            {loading === 'hard' ? 'Deleting Permanently...' : 'Delete Permanently'}
          </button>

          <button
            onClick={onCancel}
            disabled={loading !== null}
            className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050a12]/75 backdrop-blur-[3px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0b1220]/95 p-6 shadow-2xl shadow-black/50">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">{message}</p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkDeleteLifecycleModal({
  isOpen,
  selectedCount,
  alreadySoftDeleted,
  onSoftDelete,
  onHardDelete,
  onCancel,
  loading,
}: {
  isOpen: boolean
  selectedCount: number
  alreadySoftDeleted: boolean
  onSoftDelete: () => void
  onHardDelete: () => void
  onCancel: () => void
  loading: 'soft' | 'hard' | null
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#050a12]/75 backdrop-blur-[3px]" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0b1220]/95 p-6 shadow-2xl shadow-black/50">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-500/80 via-red-400/60 to-red-500/80" />

        <h3 className="text-lg font-bold text-white">Delete Selected Developers</h3>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Choose delete mode for <span className="font-semibold text-white">{selectedCount}</span> selected developer(s).
        </p>
        <p className="mt-2 text-xs text-white/45">
          Soft delete hides from platform. Permanent delete removes from database and cannot be restored.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2">
          <button
            onClick={onSoftDelete}
            disabled={alreadySoftDeleted || loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
          >
            {loading === 'soft' ? 'Soft Deleting...' : alreadySoftDeleted ? 'Already Soft Deleted' : 'Soft Delete Selected'}
          </button>

          <button
            onClick={onHardDelete}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-50"
          >
            {loading === 'hard' ? 'Deleting Permanently...' : 'Delete Permanently'}
          </button>

          <button
            onClick={onCancel}
            disabled={loading !== null}
            className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [counts, setCounts] = useState<DeveloperCounts>({ total: 0, active: 0, inactive: 0, deleted: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [country, setCountry] = useState('')
  const [tab, setTab] = useState<FilterTab>('ALL')

  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Developer | null>(null)
  const [deleteModeLoading, setDeleteModeLoading] = useState<'soft' | 'hard' | null>(null)

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkDeleteModeLoading, setBulkDeleteModeLoading] = useState<'soft' | 'hard' | null>(null)
  const [bulkRestoring, setBulkRestoring] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [repairIndiaOpen, setRepairIndiaOpen] = useState(false)
  const [repairingIndia, setRepairingIndia] = useState(false)

  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('include_deleted', 'true')

      if (country) params.set('country', country)
      if (tab === 'ACTIVE' || tab === 'INACTIVE') params.set('status', tab)
      if (tab === 'DELETED') params.set('deleted', 'true')
      if (tab === 'ALL') params.set('deleted', 'all')

      const res = await fetch(`/api/admin/developers?${params.toString()}`)
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to load developers')

      setDevelopers(Array.isArray(json.items) ? json.items : [])
      if (json.counts) {
        setCounts({
          total: Number(json.counts.total || 0),
          active: Number(json.counts.active || 0),
          inactive: Number(json.counts.inactive || 0),
          deleted: Number(json.counts.deleted || 0),
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load developers')
    } finally {
      setLoading(false)
    }
  }, [country, tab])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedDevelopers((prev) => prev.filter((id) => developers.some((dev) => dev.id === id)))
  }, [developers])

  const selectedRows = useMemo(
    () => developers.filter((dev) => selectedDevelopers.includes(dev.id)),
    [developers, selectedDevelopers]
  )
  const selectedRowsAllDeleted = useMemo(
    () => selectedRows.length > 0 && selectedRows.every((dev) => !!dev.isDeleted),
    [selectedRows]
  )

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevelopers(developers.map((dev) => dev.id))
      return
    }
    setSelectedDevelopers([])
  }

  const handleSelectOne = (id: string) => {
    setSelectedDevelopers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleRestoreOne = async (dev: Developer) => {
    try {
      const res = await fetch(`/api/admin/developers/${dev.id}/restore`, { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to restore developer')

      showToast(`"${dev.name}" restored`)
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Failed to restore developer')
    }
  }

  const handleSoftDelete = async () => {
    if (!deleteTarget) return

    setDeleteModeLoading('soft')
    try {
      const res = await fetch(`/api/admin/developers/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Soft delete failed')

      showToast(`"${deleteTarget.name}" soft deleted`)
      setDeleteTarget(null)
      setSelectedDevelopers((prev) => prev.filter((id) => id !== deleteTarget.id))
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Soft delete failed')
    } finally {
      setDeleteModeLoading(null)
    }
  }

  const handleHardDelete = async () => {
    if (!deleteTarget) return

    setDeleteModeLoading('hard')
    try {
      const res = await fetch(`/api/admin/developers/${deleteTarget.id}?mode=hard`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Hard delete failed')

      showToast(`"${deleteTarget.name}" deleted permanently`)
      setDeleteTarget(null)
      setSelectedDevelopers((prev) => prev.filter((id) => id !== deleteTarget.id))
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Hard delete failed')
    } finally {
      setDeleteModeLoading(null)
    }
  }

  const handleBulkDelete = async (mode: 'soft' | 'hard') => {
    if (selectedDevelopers.length === 0) {
      showToast('No developers selected')
      return
    }

    setBulkDeleteModeLoading(mode)
    try {
      const res = await fetch('/api/admin/developers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDevelopers, mode }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Bulk delete failed')

      showToast(
        mode === 'hard'
          ? `${json.deletedCount || 0} developer(s) deleted permanently`
          : `${json.deletedCount || 0} developer(s) soft deleted`
      )
      setSelectedDevelopers([])
      setBulkDeleteOpen(false)
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Bulk delete failed')
    } finally {
      setBulkDeleteModeLoading(null)
    }
  }

  const handleBulkRestore = async () => {
    if (selectedDevelopers.length === 0) {
      showToast('No developers selected')
      return
    }

    setBulkRestoring(true)
    try {
      const res = await fetch('/api/admin/developers/bulk-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDevelopers }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Bulk restore failed')

      showToast(`${json.restoredCount || 0} developer(s) restored`)
      setSelectedDevelopers([])
      setBulkRestoreOpen(false)
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Bulk restore failed')
    } finally {
      setBulkRestoring(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedDevelopers.length === 0) return
    setBulkApproving(true)
    try {
      const res = await fetch('/api/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'developers', ids: selectedDevelopers }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Bulk approval failed')
      showToast(`${json.updated || 0} developer(s) activated`)
      if (json.failures?.length) showToast(`${json.failures.length} developer(s) could not be activated`)
      setSelectedDevelopers([])
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Bulk approval failed')
    } finally {
      setBulkApproving(false)
    }
  }

  const handleRepairIndiaDevelopers = async () => {
    setRepairingIndia(true)
    try {
      const res = await fetch('/api/admin/developers/repair-india', { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Developer country repair failed')

      showToast(json.message || 'India developer countries repaired')
      setRepairIndiaOpen(false)
      await load()
    } catch (err: any) {
      showToast(err?.message || 'Developer country repair failed')
    } finally {
      setRepairingIndia(false)
    }
  }

  return (
    <div>
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl px-4 py-3 text-sm text-white/80">
            {toastMsg}
          </div>
        </div>
      )}

      <DeleteLifecycleModal
        isOpen={!!deleteTarget}
        developer={deleteTarget}
        onSoftDelete={handleSoftDelete}
        onHardDelete={handleHardDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteModeLoading}
      />

      <BulkDeleteLifecycleModal
        isOpen={bulkDeleteOpen}
        selectedCount={selectedDevelopers.length}
        alreadySoftDeleted={selectedRowsAllDeleted}
        onSoftDelete={() => handleBulkDelete('soft')}
        onHardDelete={() => handleBulkDelete('hard')}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkDeleteModeLoading}
      />

      <ConfirmModal
        isOpen={bulkRestoreOpen}
        title="Restore Selected Developers"
        message={`Restore ${selectedDevelopers.length} selected developer(s)?`}
        confirmLabel="Restore Selected"
        onConfirm={handleBulkRestore}
        onCancel={() => setBulkRestoreOpen(false)}
        loading={bulkRestoring}
      />

      <ConfirmModal
        isOpen={repairIndiaOpen}
        title="Repair India Developer Countries"
        message="This checks city, community, and import location evidence before correcting developers incorrectly marked UAE. India-only developers will be repaired; mixed India/UAE portfolios remain unchanged. Continue?"
        confirmLabel="Repair India Developers"
        onConfirm={handleRepairIndiaDevelopers}
        onCancel={() => setRepairIndiaOpen(false)}
        loading={repairingIndia}
      />

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Developers
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Developer Management</h1>
          <p className="mt-1 text-sm text-white/40">Lifecycle-safe management for active, inactive, and deleted developers.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRepairIndiaOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-500/20"
          >
            Repair India Countries
          </button>
          <Link
            href="/admin/developers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300"
          >
            Add Developer
          </Link>
        </div>
      </div>

      <ManagementMetricCards metrics={[
        { key: 'total', label: 'Total', value: counts.total },
        { key: 'active', label: 'Active', value: counts.active, tone: 'success' },
        { key: 'inactive', label: 'Inactive', value: counts.inactive, tone: 'warning' },
        { key: 'deleted', label: 'Deleted', value: counts.deleted, tone: 'danger' },
      ]} />

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <LifecycleTabs value={tab} options={['ALL', 'ACTIVE', 'INACTIVE', 'DELETED']} onChange={(value) => setTab(value as FilterTab)} />
        <CountryFilter value={country} options={['ALL COUNTRIES', 'UAE', 'INDIA']} onChange={setCountry} />
      </div>

      {selectedDevelopers.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-400/20 rounded-xl flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-amber-200/80">
            {selectedDevelopers.length} developer(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving || bulkDeleteModeLoading !== null || bulkRestoring || selectedRows.every((dev) => !!dev.isDeleted)}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-500/15 text-emerald-300 rounded-lg border border-emerald-400/20 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {bulkApproving ? 'Activating...' : 'Approve & Publish'}
            </button>
            <button
              onClick={async () => {
                setBulkApproving(true)
                try {
                  const res = await fetch('/api/admin/bulk-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'developers', action: 'unpublish', ids: selectedDevelopers }) })
                  const json = await res.json().catch(() => null)
                  if (!res.ok || !json?.success) throw new Error(json?.message || 'Unpublish failed')
                  setSelectedDevelopers([])
                  await load()
                } catch (err: any) { showToast(err?.message || 'Unpublish failed') } finally { setBulkApproving(false) }
              }}
              disabled={bulkApproving || bulkDeleteModeLoading !== null || bulkRestoring || selectedRows.every((dev) => !!dev.isDeleted)}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-white/5 text-white/70 rounded-lg border border-white/15 hover:bg-white/10 disabled:opacity-50"
            >
              Unpublish
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkApproving || bulkDeleteModeLoading !== null || bulkRestoring}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-red-500/15 text-red-300 rounded-lg border border-red-400/20 hover:bg-red-500/25 disabled:opacity-50"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setBulkRestoreOpen(true)}
              disabled={bulkApproving || bulkDeleteModeLoading !== null || bulkRestoring || selectedRows.every((dev) => !dev.isDeleted)}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-500/15 text-emerald-300 rounded-lg border border-emerald-400/20 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              Restore Selected
            </button>
            <button
              onClick={() => setSelectedDevelopers([])}
              disabled={bulkApproving || bulkDeleteModeLoading !== null || bulkRestoring}
              className="text-xs px-3 py-2 text-white/40 hover:text-white/60"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center text-white/40">Loading...</div>
      )}

      {!loading && developers.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedDevelopers.length === developers.length && developers.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="accent-amber-400 w-4 h-4 rounded-md cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Developer</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Country</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Lifecycle</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Projects</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {developers.map((dev) => (
                  <tr
                    key={dev.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      selectedDevelopers.includes(dev.id) ? 'bg-amber-400/[0.04]' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedDevelopers.includes(dev.id)}
                        onChange={() => handleSelectOne(dev.id)}
                        className="accent-amber-400 w-4 h-4 rounded-md cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <EntityIdentityCell name={dev.name} identifier={dev.slug} mediaUrl={dev.logo} fallbackLabel={dev.name} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/60">{dev.countryCode}</td>
                    <td className="px-5 py-3.5">
                      <LifecycleBadge status={dev.status} deleted={dev.isDeleted} />
                    </td>
                    <td className="px-5 py-3.5 text-center text-white/60">{dev._count.projects}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {dev.slug && !dev.isDeleted && (
                          <Link href={`/developers/${dev.slug}`} target="_blank" className="text-xs text-blue-300/70 hover:text-blue-300">View</Link>
                        )}
                        <Link href={`/admin/developers/${dev.id}/edit`} className="text-xs text-white/45 hover:text-amber-300">Edit</Link>
                        {dev.isDeleted && (
                          <button
                            onClick={() => handleRestoreOne(dev)}
                            className="text-xs text-emerald-300/80 hover:text-emerald-300"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(dev)}
                          className="text-xs text-red-300/70 hover:text-red-300"
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
        </div>
      )}

      {!loading && !error && developers.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ManagementEmptyState
            title="No developers found"
            detail={country || tab !== 'ALL' ? 'No developers match the current filters.' : 'No developers have been registered yet.'}
            action={tab === 'ALL' && !country ? <Link href="/admin/developers/new" className="inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-black">Add Developer</Link> : undefined}
          />
        </div>
      )}

      {!loading && developers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-white/50 text-sm">No developers found for this filter.</p>
        </div>
      )}
    </div>
  )
}
