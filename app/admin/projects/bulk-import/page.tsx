'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'

interface ImportResult {
    name: string
    slug: string
    status: 'created' | 'skipped' | 'error'
    reason?: string
}

interface ImportSummary {
    total: number
    created: number
    skipped: number
    errored: number
}

interface ImportResponse {
    success: boolean
    message?: string
    summary?: ImportSummary
    developer?: { id: string; name: string; slug: string }
    results?: ImportResult[]
}

const STATUS_ICONS: Record<string, { color: string; bg: string }> = {
    created: { color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/20' },
    skipped: { color: 'text-yellow-300', bg: 'bg-yellow-500/15 border-yellow-500/20' },
    error: { color: 'text-red-300', bg: 'bg-red-500/15 border-red-500/20' },
}

const DEMO_JSON = `{
  "developerSlug": "damac",
  "projects": [
    {
      "name": "Example Project",
      "slug": "example-project",
      "city": "Dubai",
      "community": "Downtown Dubai",
      "countryIso2": "AE",
      "goldenVisa": true,
      "startingPrice": 1800000,
      "completionYear": 2029,
      "status": "PUBLISHED"
    }
  ]
}`

export default function BulkImportPage() {
    const [jsonInput, setJsonInput] = useState('')
    const [importing, setImporting] = useState(false)
    const [response, setResponse] = useState<ImportResponse | null>(null)
    const [parseError, setParseError] = useState('')

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const text = ev.target?.result as string
            setJsonInput(text || '')
            setParseError('')
            setResponse(null)
        }
        reader.readAsText(file)
        e.target.value = ''
    }, [])

    const handleImport = useCallback(async () => {
        setParseError('')
        setResponse(null)

        // Validate JSON
        let parsed: any
        try {
            parsed = JSON.parse(jsonInput)
        } catch {
            setParseError('Invalid JSON. Please check your input.')
            return
        }

        if (!parsed.developerSlug || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
            setParseError('JSON must contain "developerSlug" and a non-empty "projects" array.')
            return
        }

        setImporting(true)
        try {
            const res = await fetch('/api/admin/projects/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonInput,
            })
            const json = await res.json()
            setResponse(json)
        } catch (err: any) {
            setResponse({ success: false, message: err.message || 'Network error' })
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link
                            href="/admin/projects"
                            className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-sm"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Projects
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">Bulk Import Projects</h1>
                    <p className="mt-1 text-sm text-white/40">
                        Import multiple developer projects from a JSON file. Auto-creates developers if needed.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* JSON Input */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/80">JSON Input</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={loadDemo}
                                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all cursor-pointer"
                                >
                                    Load Example
                                </button>
                                <label className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/80 transition-all cursor-pointer">
                                    Upload File
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value)
                                setParseError('')
                            }}
                            rows={20}
                            placeholder="Paste your JSON here or upload a file..."
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder-white/20 font-mono outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10 transition-all resize-none"
                        />

                        {parseError && (
                            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                                {parseError}
                            </div>
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
                                    Import Projects
                                </>
                            )}
                        </button>
                    </div>

                    {/* Format Guide */}
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <h3 className="text-sm font-semibold text-white/70 mb-3">JSON Format</h3>
                        <div className="space-y-2 text-[12px] text-white/40">
                            <p><span className="text-amber-300/80 font-mono">developerSlug</span> — Developer identifier (auto-creates if missing)</p>
                            <p><span className="text-amber-300/80 font-mono">developerName</span> — Optional display name</p>
                            <p><span className="text-amber-300/80 font-mono">projects[]</span> — Array of project objects</p>
                            <div className="pl-3 border-l border-white/[0.06] mt-2 space-y-1">
                                <p><span className="text-white/50 font-mono">name</span> — Project name (required)</p>
                                <p><span className="text-white/50 font-mono">slug</span> — URL slug (auto-generated if omitted)</p>
                                <p><span className="text-white/50 font-mono">city</span> — City name</p>
                                <p><span className="text-white/50 font-mono">community</span> — Community / area</p>
                                <p><span className="text-white/50 font-mono">countryIso2</span> — ISO country code (default: AE)</p>
                                <p><span className="text-white/50 font-mono">goldenVisa</span> — Boolean (default: false)</p>
                                <p><span className="text-white/50 font-mono">startingPrice</span> — Number in AED</p>
                                <p><span className="text-white/50 font-mono">completionYear</span> — Year (2000-2100)</p>
                                <p><span className="text-white/50 font-mono">status</span> — DRAFT | PUBLISHED | ARCHIVED</p>
                                <p><span className="text-white/50 font-mono">description</span> — Project description</p>
                                <p><span className="text-white/50 font-mono">coverImage</span> — Image URL</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div>
                    {response && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                            {/* Success / Error banner */}
                            {response.success ? (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-emerald-300">Import Complete</h3>
                                    </div>
                                    {response.developer && (
                                        <p className="text-xs text-emerald-300/70 mb-2">
                                            Developer: <span className="font-semibold text-emerald-300">{response.developer.name}</span>
                                        </p>
                                    )}
                                    {response.summary && (
                                        <div className="flex gap-4 text-xs">
                                            <span className="text-emerald-300">
                                                <span className="font-bold text-lg">{response.summary.created}</span> created
                                            </span>
                                            <span className="text-yellow-300">
                                                <span className="font-bold text-lg">{response.summary.skipped}</span> skipped
                                            </span>
                                            <span className="text-red-300">
                                                <span className="font-bold text-lg">{response.summary.errored}</span> errors
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                    <h3 className="text-sm font-bold text-red-300 mb-1">Import Failed</h3>
                                    <p className="text-xs text-red-300/70">{response.message || 'Unknown error'}</p>
                                </div>
                            )}

                            {/* Results list */}
                            {response.results && response.results.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-white/70 mb-3">Results ({response.results.length})</h3>
                                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                                        {response.results.map((r, i) => {
                                            const style = STATUS_ICONS[r.status] || STATUS_ICONS.error
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${style.bg}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-white/80 truncate">{r.name}</p>
                                                        <p className="text-[11px] text-white/30 font-mono truncate">{r.slug}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className={`text-[11px] font-bold uppercase ${style.color}`}>
                                                            {r.status}
                                                        </span>
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

                            {/* Action links */}
                            {response.success && (
                                <div className="flex gap-3 pt-2">
                                    <Link
                                        href="/admin/projects"
                                        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors"
                                    >
                                        View All Projects
                                    </Link>
                                    <Link
                                        href="/projects"
                                        target="_blank"
                                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-colors"
                                    >
                                        Preview Frontend
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pre-import state */}
                    {!response && !importing && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                                <svg className="h-8 w-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-white/50 text-sm">Paste JSON or upload a file to begin</p>
                            <p className="text-white/25 text-xs mt-1">Supports bulk import of multiple projects at once</p>
                        </div>
                    )}

                    {/* Importing state */}
                    {importing && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <svg className="h-8 w-8 animate-spin text-amber-400 mb-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="text-white/60 text-sm font-medium">Importing projects…</p>
                            <p className="text-white/30 text-xs mt-1">This may take a moment for large batches</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
