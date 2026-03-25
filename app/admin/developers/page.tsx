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

// ─── Delete Confirmation Modal ────────────────────────────
function DeleteModal({
  developer,
  onConfirm,
  onCancel,
  deleting,
}: {
  developer: Developer
  onConfirm: () => void
  onCancel: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="h-12 w-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-white/90 mb-2">Delete Developer?</h2>
        <p className="text-sm text-white/50 mb-1">
          You are about to remove{' '}
          <span className="text-white/80 font-semibold">{developer.name}</span> from public view.
        </p>
        <p className="text-xs text-white/30 mb-6">
          This is a soft delete — data is preserved but the developer will be hidden from the site.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/25 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Deleting…
              </>
            ) : (
              'Confirm Delete'
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────
export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ status: '', country: '' })
  const [toDelete, setToDelete] = useState<Developer | null>(null)
  const [deleting, setDeleting] = useState(false)
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

  useEffect(() => { load() }, [load])

  // ─── Quick Toggle: Status ────────────────────────────
  const toggleStatus = async (dev: Developer) => {
    const newStatus = dev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setDevelopers((prev) => prev.map((d) => d.id === dev.id ? { ...d, status: newStatus } : d))
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
      // Revert on error
      setDevelopers((prev) => prev.map((d) => d.id === dev.id ? { ...d, status: dev.status } : d))
      showToast('Failed to update status')
    }
  }

  // ─── Quick Toggle: Featured ──────────────────────────
  const toggleFeatured = async (dev: Developer) => {
    const newFeatured = !dev.isFeatured
    setDevelopers((prev) => prev.map((d) => d.id === dev.id ? { ...d, isFeatured: newFeatured } : d))
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
      setDevelopers((prev) => prev.map((d) => d.id === dev.id ? { ...d, isFeatured: dev.isFeatured } : d))
      showToast('Failed to update featured')
    }
  }

  // ─── Soft Delete ─────────────────────────────────────
  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/developers/${toDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setDevelopers((prev) => prev.filter((d) => d.id !== toDelete.id))
      showToast(`"${toDelete.name}" has been deleted`)
      setToDelete(null)
    } catch (err: any) {
      showToast(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const totalActive = developers.filter((d) => d.status === 'ACTIVE').length
  const totalFeatured = developers.filter((d) => d.isFeatured).length

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl px-4 py-3 text-sm text-white/80 flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {toastMsg}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {toDelete && (
        <DeleteModal
          developer={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          deleting={deleting}
        />
      )}

      {/* Header */}
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

      {/* Stats Row */}
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

      {/* Filters */}
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
              {c === 'UAE' ? '🇦🇪 UAE' : c === 'INDIA' ? '🇮🇳 India' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center text-white/40">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      )}

      {/* Table */}
      {!loading && developers.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
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
                  <tr key={dev.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    {/* Developer */}
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
                          <p className="text-[11px] text-white/30 font-mono">{dev.slug || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-5 py-3.5">
                      <div className="text-white/60 text-sm">
                        {dev.city && <span>{dev.city}, </span>}
                        <span className="text-white/40">{dev.countryCode === 'INDIA' ? '🇮🇳 India' : '🇦🇪 UAE'}</span>
                      </div>
                    </td>

                    {/* Projects */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
                        {dev._count.projects}
                      </span>
                    </td>

                    {/* Featured — click to toggle */}
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
                            <span className="text-xs font-semibold text-amber-300">#{dev.featuredRank || '—'}</span>
                          </>
                        ) : (
                          <svg className="h-3.5 w-3.5 text-white/20 hover:text-amber-400/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </button>
                    </td>

                    {/* Status — click to toggle */}
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
                        {dev.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                      </button>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3.5 text-white/40 text-xs">
                      {new Date(dev.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* View */}
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

                        {/* Edit */}
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

                        {/* Delete */}
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

      {/* Empty state */}
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
