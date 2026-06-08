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
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
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
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
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
                <tr key={p.id} className="text-white/80 hover:bg-white/[0.03]">
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
    </div>
  )
}
