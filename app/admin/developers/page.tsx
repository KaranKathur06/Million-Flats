'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Developer {
    id: string
    name: string
    slug: string | null
    logo: string | null
    countryCode: string
    countryIso2: string | null
    isFeatured: boolean
    createdAt: string
    _count: { projects: number; properties: number }
}

export default function AdminDevelopersPage() {
    const [developers, setDevelopers] = useState<Developer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/developers')
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load')
            setDevelopers(json.items || [])
        } catch (err: any) {
            setError(err.message || 'Failed to load developers')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">Developers</h1>
                    <p className="mt-1 text-sm text-white/40">Manage developer companies and view their projects</p>
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

            {/* Error */}
            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                </div>
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
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Logo</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Name</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Slug</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Projects</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Properties</th>
                                    <th className="text-center px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Featured</th>
                                    <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {developers.map((dev) => (
                                    <tr key={dev.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                        <td className="px-5 py-3">
                                            {dev.logo ? (
                                                <img src={dev.logo} alt={dev.name} className="h-8 w-8 rounded-lg object-cover border border-white/10" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-white/30">
                                                    {dev.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 font-medium text-white/90">{dev.name}</td>
                                        <td className="px-5 py-3 text-white/40 font-mono text-xs">{dev.slug || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
                                                {dev._count.projects}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                                {dev._count.properties}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {dev.isFeatured ? (
                                                <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-semibold">
                                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="text-white/20 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-white/40 text-xs">
                                            {new Date(dev.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                    <p className="text-white/50 text-sm">No developers yet</p>
                    <p className="text-white/30 text-xs mt-1">Add your first developer to get started</p>
                </div>
            )}
        </div>
    )
}
