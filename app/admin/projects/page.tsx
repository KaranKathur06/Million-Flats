'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

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
    completionYear: number | null
    createdAt: string
    developer: { id: string; name: string; slug: string | null }
    _count: { media: number; unitTypes: number; leads: number }
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    ARCHIVED: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
}

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<ProjectItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [publishing, setPublishing] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const query = statusFilter ? `?status=${statusFilter}` : ''
            const res = await fetch(`/api/admin/projects${query}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load')
            setProjects(json.items || [])
        } catch (err: any) {
            setError(err.message || 'Failed to load projects')
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { load() }, [load])

    const toggleStatus = async (project: ProjectItem) => {
        setPublishing(project.id)
        try {
            const newStatus = project.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
            const res = await fetch(`/api/admin/projects/${project.id}/publish`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setProjects((prev) =>
                prev.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p))
            )
        } catch (err: any) {
            alert(err.message || 'Failed to update status')
        } finally {
            setPublishing(null)
        }
    }

    const formatPrice = (price: number | null) => {
        if (!price) return '—'
        if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`
        if (price >= 1_000) return `AED ${(price / 1_000).toFixed(0)}K`
        return `AED ${price.toLocaleString()}`
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">Projects</h1>
                    <p className="mt-1 text-sm text-white/40">
                        Manage developer off-plan and ready projects
                        {!loading && <span className="ml-2 text-white/25">({projects.length} total)</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all"
                    >
                        <option value="" className="bg-[#0a1019]">All Statuses</option>
                        <option value="DRAFT" className="bg-[#0a1019]">Draft</option>
                        <option value="PUBLISHED" className="bg-[#0a1019]">Published</option>
                        <option value="ARCHIVED" className="bg-[#0a1019]">Archived</option>
                    </select>

                    <Link
                        href="/admin/projects/bulk-import"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-all"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Bulk Import
                    </Link>

                    <Link
                        href="/admin/projects/new"
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Project
                    </Link>
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
            {!loading && projects.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Project</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Developer</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">City</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Golden Visa</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Price</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Status</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Media</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Leads</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Created</th>
                                    <th className="text-right px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((p) => (
                                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {p.coverImage ? (
                                                    <img src={p.coverImage} alt="" className="h-9 w-12 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-9 w-12 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                                        <svg className="h-4 w-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-white/90 leading-tight">{p.name}</p>
                                                    <p className="text-[11px] text-white/30 font-mono mt-0.5">{p.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-white/60 text-xs">{p.developer.name}</td>
                                        <td className="px-5 py-3 text-white/50 text-xs">{p.city || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            {p.goldenVisa ? (
                                                <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-semibold">
                                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    Yes
                                                </span>
                                            ) : <span className="text-white/20 text-xs">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-white/60 text-xs font-medium">{formatPrice(p.startingPrice)}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[p.status] || ''}`}>
                                                {p.status}
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
                                                <button
                                                    onClick={() => toggleStatus(p)}
                                                    disabled={publishing === p.id}
                                                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50 ${p.status === 'PUBLISHED'
                                                        ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
                                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                                        }`}
                                                >
                                                    {publishing === p.id ? '...' : p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
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
            {!loading && projects.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-white/50 text-sm">No projects yet</p>
                    <p className="text-white/30 text-xs mt-1">Create your first developer project</p>
                </div>
            )}
        </div>
    )
}
