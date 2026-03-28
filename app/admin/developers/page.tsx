'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

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
  createdAt: string
  updatedAt: string
  _count: { projects: number; properties: number }
}

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

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/25 border border-red-500/30 px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/35 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting...
              </>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08] hover:text-white/80 transition-all disabled:opacity-50"
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ status: '', country: '' })
  const [toDelete, setToDelete] = useState<Developer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDevelopers, setSelectedDevelopers] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
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
      if (filter.status) params.set('status', filter.status)
      if (filter.country) params.set('country', filter.country)
      const res = await fetch(`/api/admin/developers?${params.toString()}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Failed to load')
      setDevelopers(json.items || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load developers')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedDevelopers((prev) => prev.filter((id) => developers.some((dev) => dev.id === id)))
  }, [developers])

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

  const toggleStatus = async (dev: Developer) => {
    const newStatus = dev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setDevelopers((prev) => prev.map((d) => (d.id === dev.id ? { ...d, status: newStatus } : d)))
    try {
      const res = await fetch(`/api/admin/developers/${dev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      showToast(`${dev.name} is now ${newStatus.toLowerCase()}`)
    } catch {
      setDevelopers((prev) => prev.map((d) => (d.id === dev.id ? { ...d, status: dev.status } : d)))
      showToast('Failed to update status')
    }
  }

  const toggleFeatured = async (dev: Developer) => {
    const newFeatured = !dev.isFeatured
    setDevelopers((prev) => prev.map((d) => (d.id === dev.id ? { ...d, isFeatured: newFeatured } : d)))
    try {
      const res = await fetch(`/api/admin/developers/${dev.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: newFeatured }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      showToast(`${dev.name} ${newFeatured ? 'marked featured' : 'unfeatured'}`)
    } catch {
      setDevelopers((prev) => prev.map((d) => (d.id === dev.id ? { ...d, isFeatured: dev.isFeatured } : d)))
      showToast('Failed to update featured')
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/developers/${toDelete.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Delete failed')

      setDevelopers((prev) => prev.filter((d) => d.id !== toDelete.id))
      setSelectedDevelopers((prev) => prev.filter((id) => id !== toDelete.id))
      showToast(`"${toDelete.name}" has been deleted`)
      setToDelete(null)
    } catch (err: any) {
      showToast(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedDevelopers.length === 0) {
      showToast('No developers selected')
      return
    }
    setBulkDeleteOpen(true)
  }

  const handleBulkDelete = async () => {
    if (selectedDevelopers.length === 0) {
      showToast('No developers selected')
      return
    }

    setBulkDeleting(true)
    try {
      console.log('Deleting IDs:', selectedDevelopers)
      const res = await fetch('/api/admin/developers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDevelopers }),
      })
      const json = await res.json().catch(() => null)
      console.log('API Response:', json)
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Bulk delete failed')

      const deletedIds = Array.isArray(json?.deletedIds) ? json.deletedIds : []
      setDevelopers((prev) => prev.filter((dev) => !deletedIds.includes(dev.id)))
      setSelectedDevelopers([])
      setBulkDeleteOpen(false)
      showToast(`${json.deletedCount || deletedIds.length} developer(s) deleted`)
    } catch (err: any) {
      showToast(err.message || 'Bulk delete failed')
    } finally {
      setBulkDeleting(false)
    }
  }

  const totalActive = developers.filter((d) => d.status === 'ACTIVE').length
  const totalFeatured = developers.filter((d) => d.isFeatured).length

  return (
    <div>
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl px-4 py-3 text-sm text-white/80 flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {toastMsg}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Delete Developer"
        message={toDelete ? `Are you sure you want to delete "${toDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        isLoading={deleting}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Delete Selected Developers"
        message={`Are you sure you want to delete ${selectedDevelopers.length} selected developer(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedDevelopers.length} Developer(s)`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        isLoading={bulkDeleting}
      />

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Developers
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Developer Management</h1>
          <p className="mt-1 text-sm text-white/40">Manage real estate developer profiles and media</p>
        </div>
        <Link
          href="/admin/developers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Developer
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: developers.length, color: 'text-white/80' },
          { label: 'Active', value: totalActive, color: 'text-emerald-400' },
          { label: 'Featured', value: totalFeatured, color: 'text-amber-400' },
          { label: 'Projects', value: developers.reduce((s, d) => s + d._count.projects, 0), color: 'text-blue-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {['', 'ACTIVE', 'INACTIVE'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter((prev) => ({ ...prev, status: s }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter.status === s
                  ? 'bg-white/[0.08] text-white/90'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {['', 'UAE', 'INDIA'].map((c) => (
            <button
              key={c}
              onClick={() => setFilter((prev) => ({ ...prev, country: c }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter.country === c
                  ? 'bg-white/[0.08] text-white/90'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {c === 'UAE' ? 'UAE' : c === 'INDIA' ? 'India' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {selectedDevelopers.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-400/20 rounded-xl flex items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-300">{selectedDevelopers.length}</span>
            </div>
            <span className="text-sm font-semibold text-amber-200/80">
              developer{selectedDevelopers.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDeleteClick}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-red-500/15 text-red-300 rounded-lg border border-red-400/20 hover:bg-red-500/25 transition-all duration-200 font-semibold disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedDevelopers([])}
              className="text-xs px-3 py-2 text-white/40 hover:text-white/60 transition-colors"
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
        <div className="flex items-center gap-3 py-12 justify-center text-white/40">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
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
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Location</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Projects</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Featured</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Status</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Created</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {developers.map((dev) => (
                  <tr
                    key={dev.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group ${
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
                        {dev.logo ? (
                          <img
                            src={dev.logo}
                            alt={dev.name}
                            className="h-9 w-9 rounded-lg object-cover border border-white/10 bg-white p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-white/30 shrink-0">
                            {dev.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white/90 truncate">{dev.name}</p>
                          <p className="text-[11px] text-white/30 font-mono">{dev.slug || '-'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-white/60 text-sm">
                        {dev.city && <span>{dev.city}, </span>}
                        <span className="text-white/40">{dev.countryCode === 'INDIA' ? 'India' : 'UAE'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
                        {dev._count.projects}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleFeatured(dev)}
                        title={dev.isFeatured ? 'Click to unfeature' : 'Click to feature'}
                        className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                      >
                        {dev.isFeatured ? (
                          <>
                            <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-xs font-semibold text-amber-300">#{dev.featuredRank || '-'}</span>
                          </>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-white/20 hover:text-amber-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleStatus(dev)}
                        title={`Click to mark ${dev.status === 'ACTIVE' ? 'inactive' : 'active'}`}
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-opacity hover:opacity-70 ${
                          dev.status === 'ACTIVE'
                            ? 'bg-emerald-400/15 text-emerald-300'
                            : 'bg-red-400/15 text-red-300'
                        }`}
                      >
                        {dev.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-white/40 text-xs">
                      {new Date(dev.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {dev.slug && (
                          <Link
                            href={`/developers/${dev.slug}`}
                            target="_blank"
                            title="View public profile"
                            className="inline-flex items-center gap-1 text-xs text-blue-300/70 hover:text-blue-300 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View
                          </Link>
                        )}

                        <span className="text-white/10 text-xs">|</span>

                        <Link
                          href={`/admin/developers/${dev.id}/edit`}
                          title="Edit developer"
                          className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-amber-300 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Link>

                        <span className="text-white/10 text-xs">|</span>

                        <button
                          onClick={() => setToDelete(dev)}
                          title="Delete developer"
                          className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

      {!loading && developers.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          </div>
          <p className="text-white/50 text-sm">No developers found</p>
          <p className="text-white/30 text-xs mt-1">Add developers manually or upload via JSON</p>
          <Link
            href="/admin/developers/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400/20 px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/30 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add First Developer
          </Link>
        </div>
      )}
    </div>
  )
}
