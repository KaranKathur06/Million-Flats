'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast, { Toaster } from 'react-hot-toast'

interface PropertyItem {
    id: string
    title: string | null
    city: string | null
    community: string | null
    propertyType: string | null
    intent: string | null
    price: number | null
    currency: string
    bedrooms: number
    bathrooms: number
    squareFeet: number
    status: string
    constructionStatus: string | null
    developerName: string | null
    countryCode: string
    archivedAt: string | null
    createdAt: string
    updatedAt: string
    agent: { id: string; user: { name: string | null; email: string | null; image: string | null } }
    _count: { media: number; inquiries: number }
}

type LifecycleFilter = 'all' | 'active' | 'pending' | 'rejected' | 'sold' | 'archived'

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    PENDING_REVIEW: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    APPROVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    REJECTED: 'bg-red-500/15 text-red-300 border-red-500/20',
    SOLD: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    ARCHIVED: 'bg-white/[0.10] text-white/60 border-white/[0.20]',
}

function formatPrice(amount: number | null, currency: string) {
    if (!amount) return '—'
    if (currency === 'INR') {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
        return `₹${amount.toLocaleString()}`
    }
    return `${currency} ${amount.toLocaleString()}`
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

export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<PropertyItem[]>([])
    const [loading, setLoading] = useState(true)
    const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active')
    const [cityFilter, setCityFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkActionLoading, setBulkActionLoading] = useState<null | string>(null)
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0, sold: 0, archived: 0 })
    const [deleteTarget, setDeleteTarget] = useState<PropertyItem | null>(null)
    const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<PropertyItem | null>(null)
    const [permanentDeleteConfirmation, setPermanentDeleteConfirmation] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('lifecycle', lifecycleFilter)
            if (cityFilter) params.set('city', cityFilter)
            if (typeFilter) params.set('propertyType', typeFilter)
            if (searchQuery) params.set('search', searchQuery)
            const res = await fetch(`/api/admin/properties?${params.toString()}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load properties')
            setProperties(json.items || [])
            setStats(json.lifecycleStats || { total: 0, active: 0, pending: 0, rejected: 0, sold: 0, archived: 0 })
        } catch (err: any) {
            toast.error(err.message || 'Failed to load properties')
            setProperties([])
        } finally {
            setLoading(false)
        }
    }, [lifecycleFilter, cityFilter, typeFilter, searchQuery])

    useEffect(() => { load() }, [load])

    // Bulk actions
    const runBulkAction = useCallback(async (action: string) => {
        if (selectedIds.length === 0) return
        setBulkActionLoading(action)
        try {
            const res = await fetch('/api/admin/properties/bulk-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, action }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Bulk action failed')
            toast.success(`${json.updated} properties ${action}d`)
            setSelectedIds([])
            load()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setBulkActionLoading(null)
        }
    }, [selectedIds, load])

    // Single property status change
    const changeStatus = useCallback(async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/admin/properties/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            toast.success(`Property ${status.toLowerCase()}`)
            load()
        } catch (err: any) {
            toast.error(err.message)
        }
    }, [load])

    // Soft delete
    const softDelete = useCallback(async (item: PropertyItem) => {
        setDeleting(item.id)
        try {
            const res = await fetch(`/api/admin/properties/${item.id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            toast.success('Property archived')
            setDeleteTarget(null)
            load()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setDeleting(null)
        }
    }, [load])

    // Permanent delete
    const permanentDelete = useCallback(async () => {
        if (!permanentDeleteTarget || permanentDeleteConfirmation !== 'DELETE') return
        setDeleting(permanentDeleteTarget.id)
        try {
            const res = await fetch(`/api/admin/properties/${permanentDeleteTarget.id}?permanent=true`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            toast.success('Property permanently deleted')
            setPermanentDeleteTarget(null)
            setPermanentDeleteConfirmation('')
            load()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setDeleting(null)
        }
    }, [permanentDeleteTarget, permanentDeleteConfirmation, load])

    // Select helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
    const toggleAll = () => {
        setSelectedIds(prev => prev.length === properties.length ? [] : properties.map(p => p.id))
    }
    const selectedCount = selectedIds.length

    // Unique values for filters
    const cities = useMemo(() => {
        const set = new Set(properties.map(p => p.city).filter(Boolean))
        return Array.from(set).sort()
    }, [properties])

    const types = useMemo(() => {
        const set = new Set(properties.map(p => p.propertyType).filter(Boolean))
        return Array.from(set).sort()
    }, [properties])

    const lifecycleTabs: { key: LifecycleFilter; label: string; count: number }[] = [
        { key: 'active', label: 'Active', count: stats.active },
        { key: 'pending', label: 'Pending', count: stats.pending },
        { key: 'rejected', label: 'Rejected', count: stats.rejected },
        { key: 'sold', label: 'Sold', count: stats.sold },
        { key: 'archived', label: 'Archived', count: stats.archived },
        { key: 'all', label: 'All', count: stats.total },
    ]

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: '#0a1628', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">Properties</h1>
                    <p className="mt-1 text-sm text-white/40">Manage all property listings across your platform</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/properties/bulk-import" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Bulk Import
                    </Link>
                    <Link href="/admin/properties/new" className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Property
                    </Link>
                </div>
            </div>

            {/* Lifecycle Tabs */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-hide">
                {lifecycleTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setLifecycleFilter(tab.key); setSelectedIds([]) }}
                        className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${lifecycleFilter === tab.key
                            ? 'bg-white/[0.10] text-white border border-white/[0.15]'
                            : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'}`}
                    >
                        {tab.label}
                        <span className={`text-[11px] font-bold ${lifecycleFilter === tab.key ? 'text-amber-300' : 'text-white/25'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by title, city, community..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10"
                    />
                </div>
                <select
                    value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white/60 outline-none cursor-pointer"
                >
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c} value={c!}>{c}</option>)}
                </select>
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white/60 outline-none cursor-pointer"
                >
                    <option value="">All Types</option>
                    {types.map(t => <option key={t} value={t!}>{t}</option>)}
                </select>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedCount > 0 && (
                <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-400/5">
                    <span className="text-sm font-medium text-amber-300">{selectedCount} selected</span>
                    <div className="flex items-center gap-2 ml-auto">
                        {lifecycleFilter !== 'active' && (
                            <button onClick={() => runBulkAction('approve')} disabled={bulkActionLoading !== null} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 cursor-pointer">
                                {bulkActionLoading === 'approve' ? 'Approving...' : 'Approve'}
                            </button>
                        )}
                        <button onClick={() => runBulkAction('reject')} disabled={bulkActionLoading !== null} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 cursor-pointer">
                            {bulkActionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button onClick={() => runBulkAction('archive')} disabled={bulkActionLoading !== null} className="rounded-lg border border-white/[0.15] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.10] disabled:opacity-50 cursor-pointer">
                            {bulkActionLoading === 'archive' ? 'Archiving...' : 'Archive'}
                        </button>
                        <button onClick={() => setSelectedIds([])} className="rounded-lg px-3 py-1.5 text-xs text-white/40 hover:text-white/70 cursor-pointer">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <TableSkeletonRows />
            ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <p className="text-white/50 text-sm">No properties found</p>
                    <p className="text-white/25 text-xs mt-1">Try adjusting your filters or add some properties</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/[0.06] text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                        <div className="col-span-1 flex items-center">
                            <input type="checkbox" checked={selectedIds.length === properties.length && properties.length > 0} onChange={toggleAll} className="rounded border-white/20 bg-white/5 cursor-pointer" />
                        </div>
                        <div className="col-span-3">Property</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-1">Price</div>
                        <div className="col-span-1">Beds</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-2">Agent</div>
                        <div className="col-span-1">Actions</div>
                    </div>

                    {/* Table Rows */}
                    <div className="divide-y divide-white/[0.04]">
                        {properties.map(p => (
                            <div key={p.id} className={`grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors ${selectedIds.includes(p.id) ? 'bg-amber-400/[0.03]' : ''}`}>
                                <div className="col-span-1 flex items-center">
                                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-white/20 bg-white/5 cursor-pointer" />
                                </div>
                                <div className="col-span-3 flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-white/[0.06] flex-shrink-0 overflow-hidden">
                                        {p._count.media > 0 ? (
                                            <div className="h-full w-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-[10px] text-amber-300/60">{p._count.media}📷</div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-white/15">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white/80 truncate">{p.title || 'Untitled'}</p>
                                        <p className="text-[11px] text-white/30 truncate">{p.propertyType || 'Property'} • {p.intent === 'RENT' ? 'Rent' : 'Buy'}</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-white/60 truncate">{p.city || '—'}</p>
                                    <p className="text-[11px] text-white/25 truncate">{p.community || ''}</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-sm font-medium text-white/70">{formatPrice(p.price, p.currency)}</p>
                                </div>
                                <div className="col-span-1">
                                    <p className="text-sm text-white/60">{p.bedrooms || '—'} / {p.bathrooms || '—'}</p>
                                    <p className="text-[11px] text-white/25">{p.squareFeet ? `${p.squareFeet.toLocaleString()} sqft` : ''}</p>
                                </div>
                                <div className="col-span-1">
                                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT}`}>
                                        {p.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-white/50 truncate">{p.agent?.user?.name || 'System'}</p>
                                </div>
                                <div className="col-span-1 flex items-center gap-1">
                                    <Link href={`/properties/${p.id}`} target="_blank" className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all" title="Preview">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </Link>
                                    {p.status !== 'APPROVED' && (
                                        <button onClick={() => changeStatus(p.id, 'APPROVED')} className="rounded-lg p-1.5 text-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer" title="Approve">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                    )}
                                    <button onClick={() => setDeleteTarget(p)} className="rounded-lg p-1.5 text-red-400/40 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-red-500/35 bg-[#071328] p-6">
                        <h3 className="text-xl font-semibold text-white">Delete Property?</h3>
                        <p className="mt-3 text-sm text-white/70 leading-relaxed">
                            This will archive &quot;{deleteTarget.title}&quot; and remove it from public listings. It can be restored later.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10 cursor-pointer">Cancel</button>
                            <button onClick={() => softDelete(deleteTarget)} disabled={deleting === deleteTarget.id} className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50 cursor-pointer">
                                {deleting === deleteTarget.id ? 'Deleting...' : 'Delete Property'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permanent Delete Modal */}
            {permanentDeleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-red-500/35 bg-[#071328] p-6">
                        <h3 className="text-xl font-semibold text-white">Permanently Delete Property?</h3>
                        <p className="mt-3 text-sm text-white/70 leading-relaxed">
                            This action cannot be undone. The property and all associated media will be permanently removed.
                        </p>
                        <label className="mt-5 block text-sm font-medium text-white/75">
                            Type DELETE to confirm
                            <input
                                value={permanentDeleteConfirmation}
                                onChange={e => setPermanentDeleteConfirmation(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-400/40"
                                placeholder="DELETE"
                            />
                        </label>
                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button onClick={() => { setPermanentDeleteTarget(null); setPermanentDeleteConfirmation('') }} className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm text-white/80 hover:bg-white/10 cursor-pointer">Cancel</button>
                            <button onClick={permanentDelete} disabled={permanentDeleteConfirmation !== 'DELETE' || deleting === permanentDeleteTarget.id} className="rounded-lg border border-red-500/35 bg-red-500/15 px-3.5 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                                {deleting === permanentDeleteTarget.id ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
