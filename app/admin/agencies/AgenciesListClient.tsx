'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

interface AgencyProfile {
  id: string
  agencyName: string | null
  user: { email: string; createdAt: string } | null
  onboardingStatus: string
  kycStatus: string
  profileCompletion: number
  linkedAgency: { name: string } | null
  isVerified: boolean
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  PROFILE_COMPLETED: 'bg-purple-100 text-purple-700',
  PROFILE_INCOMPLETE: 'bg-gray-100 text-gray-600',
  REGISTERED: 'bg-gray-100 text-gray-400',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

const KYC_COLORS: Record<string, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  NOT_SUBMITTED: 'bg-gray-100 text-gray-500',
}

export default function AgenciesListClient({
  profiles,
  total,
  status,
  page,
  q,
  statusCounts,
}: {
  profiles: AgencyProfile[]
  total: number
  status: string
  page: number
  q: string
  statusCounts: Record<string, number>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(q)

  const limit = 25
  const totalPages = Math.ceil(total / limit)

  const handleSelectAll = () => {
    if (selected.size === profiles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(profiles.map(p => p.id)))
    }
  }

  const handleToggle = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return
    setLoading(true)
    try {
      const response = await fetch('/api/admin/agencies/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          agencyIds: Array.from(selected),
        }),
      })
      if (response.ok) {
        setSelected(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (searchQuery) params.set('q', searchQuery)
    router.push(`/admin/agencies?${params.toString()}`)
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const STATUS_FILTERS = [
    { value: '', label: 'All', count: Object.values(statusCounts).reduce((a: number, b) => a + (b as number), 0) },
    { value: 'UNDER_REVIEW', label: 'Pending Approval', count: statusCounts['UNDER_REVIEW'] || 0 },
    { value: 'APPROVED', label: 'Approved', count: statusCounts['APPROVED'] || 0 },
    { value: 'PROFILE_COMPLETED', label: 'Profile Complete', count: statusCounts['PROFILE_COMPLETED'] || 0 },
    { value: 'PROFILE_INCOMPLETE', label: 'Incomplete', count: statusCounts['PROFILE_INCOMPLETE'] || 0 },
    { value: 'REJECTED', label: 'Rejected', count: statusCounts['REJECTED'] || 0 },
    { value: 'SUSPENDED', label: 'Suspended', count: statusCounts['SUSPENDED'] || 0 },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Management</h1>
          <p className="text-gray-600 text-sm mt-1">
            {total} {total === 1 ? 'profile' : 'profiles'} • {statusCounts['UNDER_REVIEW'] || 0} pending approval
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-5 flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by agency name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Link
            key={f.value}
            href={`/admin/agencies?status=${f.value}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
              status === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${status === f.value ? 'bg-white/20' : 'bg-gray-100'}`}>
                {f.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={loading}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={loading}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              disabled={loading}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Suspend
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={loading}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 w-6">
                <input
                  type="checkbox"
                  checked={selected.size === profiles.length && profiles.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              {['Agency Name', 'Email', 'Status', 'KYC', 'Completion', 'Linked', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm">No agencies found</p>
                  </div>
                </td>
              </tr>
            ) : (
              profiles.map((p: AgencyProfile) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => handleToggle(p.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                    {p.agencyName || <span className="text-gray-400 italic">Unnamed</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.user?.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[p.onboardingStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {(p.onboardingStatus || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${KYC_COLORS[p.kycStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {p.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            p.profileCompletion === 100 ? 'bg-emerald-500' : p.profileCompletion >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${p.profileCompletion || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-8">{p.profileCompletion || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.linkedAgency ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {p.linkedAgency.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{p.user?.createdAt ? fmt(p.user.createdAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/agencies/${p.id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/agencies?status=${status}&page=${page - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
                >
                  ← Previous
                </Link>
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = page <= 3 ? i + 1 : page + i - 2
                  if (pageNum > totalPages) return null
                  return (
                    <Link
                      key={pageNum}
                      href={`/admin/agencies?status=${status}&page=${pageNum}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pageNum === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  )
                })}
              </div>
              {page < totalPages && (
                <Link
                  href={`/admin/agencies?status=${status}&page=${page + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-100 transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
