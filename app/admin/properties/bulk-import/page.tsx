'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

const DEMO_JSON = JSON.stringify({
    systemAgentEmail: 'admin@millionflats.com',
    properties: [
        {
            title: 'Lodha Alibaug 3 BHK Apartment',
            propertyType: 'Apartment',
            intent: 'SALE',
            price: 15000000,
            currency: 'INR',
            constructionStatus: 'OFF_PLAN',
            shortDescription: 'Premium 3 BHK apartment in Alibaug by Lodha Group with modern amenities and sea views.',
            bedrooms: 3,
            bathrooms: 2,
            squareFeet: 1200,
            countryCode: 'INDIA',
            countryIso2: 'IN',
            city: 'Navi Mumbai',
            community: 'Alibag',
            address: 'Alibag, Navi Mumbai',
            developerName: 'Lodha Group',
            amenities: ['Swimming Pool', 'Gym', 'Clubhouse', 'Garden', 'Parking'],
            status: 'APPROVED',
            images: [
                { url: 'https://example.com/cover.jpg', category: 'COVER' },
                { url: 'https://example.com/exterior1.jpg', category: 'EXTERIOR' },
            ],
        },
    ],
}, null, 2)

const STATUS_ICONS: Record<string, { color: string; bg: string }> = {
    created: { color: 'text-emerald-300', bg: 'bg-emerald-500/5 border-emerald-500/15' },
    skipped: { color: 'text-yellow-300', bg: 'bg-yellow-500/5 border-yellow-500/15' },
    error: { color: 'text-red-300', bg: 'bg-red-500/5 border-red-500/15' },
}

export default function AdminPropertiesBulkImportPage() {
    const [jsonInput, setJsonInput] = useState('')
    const [parseError, setParseError] = useState('')
    const [importing, setImporting] = useState(false)
    const [response, setResponse] = useState<any>(null)

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const text = ev.target?.result as string
            setJsonInput(text)
            setParseError('')
            setResponse(null)
        }
        reader.readAsText(file)
        e.target.value = ''
    }, [])

    const handleImport = useCallback(async () => {
        setParseError('')
        setResponse(null)

        let payload: any
        try {
            payload = JSON.parse(jsonInput)
        } catch {
            setParseError('Invalid JSON — check your syntax')
            return
        }

        if (!payload.properties || !Array.isArray(payload.properties) || payload.properties.length === 0) {
            setParseError('JSON must contain a "properties" array with at least one item')
            return
        }

        setImporting(true)
        try {
            const res = await fetch('/api/admin/properties/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonInput,
            })
            const json = await res.json()
            setResponse(json)
            if (json.success) {
                toast.success(`Import complete: ${json.summary.created} created, ${json.summary.skipped} skipped`)
            } else {
                toast.error(json.message || 'Import failed')
            }
        } catch (err: any) {
            setResponse({ success: false, message: err.message || 'Network error' })
            toast.error(err.message || 'Import failed')
        } finally {
            setImporting(false)
        }
    }, [jsonInput])

    const loadDemo = useCallback(() => {
        setJsonInput(DEMO_JSON)
        setParseError('')
        setResponse(null)
    }, [])

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: '#0a1628', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/admin/properties" className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-sm">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Properties
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">Bulk Import Properties</h1>
                    <p className="mt-1 text-sm text-white/40">Import multiple properties from a JSON file. Creates a system agent account if needed.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* JSON Input */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/80">JSON Input</h2>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={loadDemo} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all cursor-pointer">
                                    Load Example
                                </button>
                                <label className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all cursor-pointer">
                                    Upload File
                                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={e => { setJsonInput(e.target.value); setParseError('') }}
                            rows={20}
                            placeholder="Paste your JSON here or upload a file..."
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder-white/20 font-mono outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10 transition-all resize-none"
                        />

                        {parseError && (
                            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{parseError}</div>
                        )}

                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={importing || !jsonInput.trim()}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400/90 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {importing ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Importing…
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Import Properties
                                </>
                            )}
                        </button>
                    </div>

                    {/* Format Guide */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <h3 className="text-sm font-semibold text-white/70 mb-3">JSON Format</h3>
                        <div className="space-y-2 text-[12px] text-white/40">
                            <p><span className="text-amber-300/80 font-mono">systemAgentEmail</span> — Agent email for property ownership (default: admin@millionflats.com)</p>
                            <p><span className="text-amber-300/80 font-mono">properties[]</span> — Array of property objects</p>
                            <div className="pl-3 border-l border-white/[0.06] mt-2 space-y-1">
                                <p><span className="text-white/50 font-mono">title</span> — Property title (required)</p>
                                <p><span className="text-white/50 font-mono">propertyType</span> — Apartment, Villa, Plot, Penthouse, etc.</p>
                                <p><span className="text-white/50 font-mono">intent</span> — SALE | RENT</p>
                                <p><span className="text-white/50 font-mono">price</span> — Number (in local currency)</p>
                                <p><span className="text-white/50 font-mono">currency</span> — INR | AED | USD</p>
                                <p><span className="text-white/50 font-mono">constructionStatus</span> — READY | OFF_PLAN</p>
                                <p><span className="text-white/50 font-mono">bedrooms</span> — Number of bedrooms</p>
                                <p><span className="text-white/50 font-mono">bathrooms</span> — Number of bathrooms</p>
                                <p><span className="text-white/50 font-mono">squareFeet</span> — Area in sq ft</p>
                                <p><span className="text-white/50 font-mono">city</span> — City name</p>
                                <p><span className="text-white/50 font-mono">community</span> — Locality / area</p>
                                <p><span className="text-white/50 font-mono">countryCode</span> — INDIA | UAE</p>
                                <p><span className="text-white/50 font-mono">countryIso2</span> — IN | AE</p>
                                <p><span className="text-white/50 font-mono">developerName</span> — Developer name</p>
                                <p><span className="text-white/50 font-mono">amenities</span> — Array of amenity names</p>
                                <p><span className="text-white/50 font-mono">status</span> — APPROVED | DRAFT</p>
                                <p><span className="text-white/50 font-mono">images</span> — Array of {'{url, category}'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div>
                    {response && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                            {response.success ? (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-emerald-300">Import Complete</h3>
                                    </div>
                                    {response.summary && (
                                        <div className="flex gap-4 text-xs">
                                            <span className="text-emerald-300"><span className="font-bold text-lg">{response.summary.created}</span> created</span>
                                            <span className="text-yellow-300"><span className="font-bold text-lg">{response.summary.skipped}</span> skipped</span>
                                            <span className="text-red-300"><span className="font-bold text-lg">{response.summary.errored}</span> errors</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                    <h3 className="text-sm font-bold text-red-300 mb-1">Import Failed</h3>
                                    <p className="text-xs text-red-300/70">{response.message || 'Unknown error'}</p>
                                </div>
                            )}

                            {response.results && response.results.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-white/70 mb-3">Results ({response.results.length})</h3>
                                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                                        {response.results.map((r: any, i: number) => {
                                            const style = STATUS_ICONS[r.status] || STATUS_ICONS.error
                                            return (
                                                <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${style.bg}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-white/80 truncate">{r.title}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className={`text-[11px] font-bold uppercase ${style.color}`}>{r.status}</span>
                                                        {r.reason && (
                                                            <p className="text-[10px] text-white/25 max-w-[180px] truncate">{r.reason}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {response.success && (
                                <div className="flex gap-3 pt-2">
                                    <Link href="/admin/properties" className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors">
                                        View All Properties
                                    </Link>
                                    <Link href="/properties" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-colors">
                                        Preview Frontend
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {!response && !importing && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                                <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-white/50 text-sm">Paste JSON or upload a file to begin</p>
                            <p className="text-white/25 text-xs mt-1">Supports bulk import of multiple properties at once</p>
                        </div>
                    )}

                    {importing && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <svg className="h-8 w-8 animate-spin text-amber-400 mb-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="text-white/60 text-sm font-medium">Importing properties…</p>
                            <p className="text-white/30 text-xs mt-1">This may take a moment for large batches</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
