'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import SelectDropdown from '@/components/SelectDropdown'
import { partnerProfileUrl } from '@/lib/ecosystem/partnerProfile'

type Category = { id: string; slug: string; title: string }

type Partner = {
  id: string
  name: string
  slug: string | null
  status: string
  isFeatured: boolean
  isVerified: boolean
  isActive: boolean
  rating: number | null
  locationCoverage: string | null
  category: { slug: string; title: string }
  _count: { portfolios: number; reviews: number; leads: number }
}

export default function AdminEcosystemPartnersManagePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkPermanentDeleteModalOpen, setBulkPermanentDeleteModalOpen] = useState(false)
  const [bulkPermanentDeleteIds, setBulkPermanentDeleteIds] = useState<string[]>([])
  const [bulkPermanentDeleteConfirmation, setBulkPermanentDeleteConfirmation] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())

      const partnersRes = await fetch(`/api/admin/ecosystem-partners/manage?${params}`, { cache: 'no-store' })
      const partnersJson = await partnersRes.json()
      if (partnersJson.success) setPartners(partnersJson.data)

      const catList = await fetch('/api/admin/ecosystem-partners/categories', { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({ success: false, data: [] }))
      if (catList.success) setCategories(catList.data)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => partners.some((partner) => partner.id === id)))
  }, [partners])

  const allSelected = partners.length > 0 && partners.every((partner) => selectedIds.includes(partner.id))

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : partners.map((partner) => partner.id))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const handleBulkApprove = async () => {
    if (!selectedIds.length) return
    setBulkApproving(true)
    try {
      const response = await fetch('/api/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'ecosystem-partners', ids: selectedIds }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.success) throw new Error(json?.message || 'Bulk approval failed')
      setSelectedIds([])
      await load()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Bulk approval failed')
    } finally {
      setBulkApproving(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (!selectedIds.length) return

    if (action === 'permanent_delete') {
      setBulkPermanentDeleteIds(selectedIds)
      setBulkPermanentDeleteConfirmation('')
      setBulkPermanentDeleteModalOpen(true)
      return
    }

    setBulkApproving(true)
    try {
      const response = await fetch('/api/admin/bulk-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'ecosystem-partners', action, ids: selectedIds }) })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.success) throw new Error(json?.message || 'Partner action failed')
      setSelectedIds([])
      await load()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Partner action failed')
    } finally {
      setBulkApproving(false)
    }
  }

  const confirmPermanentDelete = async () => {
    if (!bulkPermanentDeleteIds.length) return
    if (bulkPermanentDeleteConfirmation !== 'DELETE') return

    setBulkApproving(true)
    try {
      const response = await fetch('/api/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'ecosystem-partners', action: 'permanent_delete', ids: bulkPermanentDeleteIds }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.success) throw new Error(json?.message || 'Partner permanent delete failed')

      setSelectedIds([])
      setBulkPermanentDeleteIds([])
      setBulkPermanentDeleteConfirmation('')
      setBulkPermanentDeleteModalOpen(false)
      await load()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Partner permanent delete failed')
    } finally {
      setBulkApproving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ecosystem Partners</h1>
          <p className="mt-1 text-sm text-white/60">Manage partner profiles, verification, and directory visibility.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/leads?leadType=ECOSYSTEM"
            className="inline-flex h-10 items-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/80 hover:bg-white/5"
          >
            Partner Leads
          </Link>
          <Link
            href="/admin/ecosystem-partners/manage/new"
            className="inline-flex h-10 items-center rounded-xl bg-accent-yellow px-4 text-sm font-semibold text-dark-blue"
          >
            Add Partner
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners..."
          className="h-10 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50"
        />
        <SelectDropdown
          label="Category"
          showLabel={false}
          variant="dark"
          dense
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="All Categories"
          options={[
            { value: '', label: 'All Categories' },
            ...categories.map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
        <SelectDropdown
          label="Status"
          showLabel={false}
          variant="dark"
          dense
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={[
            { value: '', label: 'All Status' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'REJECTED', label: 'Rejected' },
          ]}
        />
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/15"
        >
          Apply Filters
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-500/10 px-4 py-3">
            <span className="text-sm font-semibold text-amber-200/80">{selectedIds.length} partner(s) selected</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleBulkAction('approve')} disabled={bulkApproving} className="rounded-lg border border-emerald-400/20 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50">{bulkApproving ? 'Working...' : 'Approve & Publish'}</button>
              <button type="button" onClick={() => handleBulkAction('unpublish')} disabled={bulkApproving} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 disabled:opacity-50">Unpublish</button>
              <button type="button" onClick={() => handleBulkAction('reject')} disabled={bulkApproving} className="rounded-lg border border-red-400/20 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Reject</button>
              <button type="button" onClick={() => handleBulkAction('delete')} disabled={bulkApproving} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Delete</button>
              <button type="button" onClick={() => handleBulkAction('permanent_delete')} disabled={bulkApproving} className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50">Permanent Delete</button>
              <button type="button" onClick={() => setSelectedIds([])} disabled={bulkApproving} className="px-3 py-2 text-xs text-white/40 hover:text-white/70">
                Clear
              </button>
            </div>
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-3 font-semibold"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-amber-400" /></th>
              <th className="px-4 py-3 font-semibold">Partner</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Stats</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  Loading...
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No partners found. Add your first partner or run the seed script.
                </td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className={`text-white/80 hover:bg-white/[0.03] ${selectedIds.includes(p.id) ? 'bg-amber-400/[0.04]' : ''}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 accent-amber-400" /></td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-white/45">{p.slug || '—'}</div>
                    <div className="mt-1 flex gap-2">
                      {p.isVerified && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Verified
                        </span>
                      )}
                      {p.isFeatured && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.category.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        p.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : p.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {p._count.portfolios} portfolios · {p._count.reviews} reviews · {p._count.leads} leads
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/ecosystem-partners/manage/${p.id}/edit`}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
                      >
                        Edit
                      </Link>
                      {p.slug && (
                        <a
                          href={partnerProfileUrl(p.category.slug, p.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {bulkPermanentDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/35 bg-[#071328] p-6">
            <h3 className="text-xl font-semibold text-white">Permanently Delete Partner(s)?</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              This action cannot be undone. The selected partner profiles and their associated data will be permanently removed from MillionFlats.
            </p>
            <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-white/80">
              <div className="flex justify-between gap-4 py-1">
                <span className="text-white/50">Partners selected:</span>
                <span className="font-semibold text-white">{bulkPermanentDeleteIds.length}</span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-white/50">Status:</span>
                <span className="font-semibold text-red-200">Deleted</span>
              </div>
            </div>
            <label className="mt-5 block text-sm font-medium text-white/75">
              Type DELETE to confirm
              <input
                value={bulkPermanentDeleteConfirmation}
                onChange={(e) => setBulkPermanentDeleteConfirmation(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-400/40"
                placeholder="DELETE"
              />
            </label>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkPermanentDeleteModalOpen(false)
                  setBulkPermanentDeleteIds([])
                  setBulkPermanentDeleteConfirmation('')
                }}
                className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={bulkPermanentDeleteConfirmation !== 'DELETE' || bulkApproving}
                className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkApproving ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
