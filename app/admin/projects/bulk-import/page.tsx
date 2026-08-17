'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'

interface ImportSummary {
    totalProjects: number
    validProjects: number
    warnings: number
    errors: number
    duplicateCandidates: number
    missingDevelopers: number
    unresolvedLocations: number
    sourceMediaReferences: number
}

interface ImportProjectPreview {
    name: string
    developer: { slug: string; name: string } | null
    countryIso2: string | null
    city: string | null
    community: string | null
    startingPrice: number | null
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    validation: {
        errors: string[]
        warnings: string[]
        state: 'READY' | 'NEEDS_REVIEW' | 'BLOCKED'
    }
    needsReview: boolean
    isBlocked: boolean
    duplicateCandidate?: boolean
    sourceMedia?: Array<{ source: string; sourceUrl: string; category?: string; status?: string }>
}

interface ImportResponse {
    success: boolean
    message?: string
    summary?: ImportSummary
    requiresReview?: boolean
    preview?: {
        ok: boolean
        summary: ImportSummary
        projects: ImportProjectPreview[]
        warnings: string[]
        errors: string[]
    }
}

const DEMO_JSON = `{
  "schemaVersion": "2.0",
  "importType": "PROJECTS",
  "source": {
    "provider": "SQUAREYARDS",
    "sourceUrl": "https://www.squareyards.com/property/navi-mumbai",
    "scrapedAt": "2026-08-17T00:00:00.000Z"
  },
  "projects": [
    {
      "name": "Example Project",
      "developer": { "slug": "example-developer", "name": "Example Developer" },
      "countryIso2": "IN",
      "city": "Navi Mumbai",
      "community": "Ulwe",
      "startingPrice": "INR 65 Lac",
      "status": "DRAFT",
      "featured": false,
      "goldenVisa": false,
      "sourceMedia": [
        {
          "source": "SQUAREYARDS",
          "sourceUrl": "https://images.example.com/project.jpg",
          "category": "GALLERY",
          "status": "REVIEW_REQUIRED"
        }
      ]
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

        let parsed: any
        try {
            parsed = JSON.parse(jsonInput)
        } catch {
            setParseError('Invalid JSON. Please check your input.')
            return
        }

        const normalizedPayload = Array.isArray(parsed)
            ? {
                schemaVersion: '2.0',
                importType: 'PROJECTS',
                source: {
                    provider: 'SQUAREYARDS',
                    sourceUrl: null,
                    scrapedAt: new Date().toISOString(),
                },
                projects: parsed,
            }
            : parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)
                ? parsed
                : parsed && typeof parsed === 'object' && parsed.name
                    ? {
                        schemaVersion: '2.0',
                        importType: 'PROJECTS',
                        source: {
                            provider: 'SQUAREYARDS',
                            sourceUrl: parsed.sourceUrl || null,
                            scrapedAt: parsed.scrapedAt || new Date().toISOString(),
                        },
                        projects: [parsed],
                    }
                    : null

        if (!normalizedPayload || !Array.isArray(normalizedPayload.projects) || normalizedPayload.projects.length === 0) {
            setParseError('JSON must be a valid V2 envelope, a raw project array, or a single project object.')
            return
        }

        setImporting(true)
        try {
            const res = await fetch('/api/admin/projects/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedPayload),
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
                        Review imported project data before any human approval. This path does not write directly to the database.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            placeholder="Paste your V2 JSON here..."
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
                                    Validating…
                                </>
                            ) : (
                                <>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Validate & Review
                                </>
                            )}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <h3 className="text-sm font-semibold text-white/70 mb-3">V2 Envelope Format</h3>
                        <div className="space-y-2 text-[12px] text-white/40">
                            <p><span className="text-amber-300/80 font-mono">schemaVersion</span> — Must be 2.0</p>
                            <p><span className="text-amber-300/80 font-mono">importType</span> — PROJECTS</p>
                            <p><span className="text-amber-300/80 font-mono">source</span> — Provider metadata</p>
                            <p><span className="text-amber-300/80 font-mono">projects[]</span> — Per-project object list</p>
                            <div className="pl-3 border-l border-white/[0.06] mt-2 space-y-1">
                                <p><span className="text-white/50 font-mono">name</span> — Project title</p>
                                <p><span className="text-white/50 font-mono">developer</span> — {"{ slug, name }"} object</p>
                                <p><span className="text-white/50 font-mono">countryIso2</span> — IN or AE</p>
                                <p><span className="text-white/50 font-mono">city</span> — City name</p>
                                <p><span className="text-white/50 font-mono">community</span> — Community name</p>
                                <p><span className="text-white/50 font-mono">startingPrice</span> — Numeric or string, e.g. INR 65 Lac</p>
                                <p><span className="text-white/50 font-mono">status</span> — Defaults to DRAFT</p>
                                <p><span className="text-white/50 font-mono">sourceMedia</span> — Optional review media refs</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    {response && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                            {response.success ? (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-emerald-300">Review Ready</h3>
                                    </div>
                                    <p className="text-xs text-emerald-300/80 mb-3">{response.message}</p>
                                    {response.summary && (
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <span className="text-emerald-300"><span className="font-bold text-lg block">{response.summary.validProjects}</span> valid</span>
                                            <span className="text-yellow-300"><span className="font-bold text-lg block">{response.summary.warnings}</span> warnings</span>
                                            <span className="text-red-300"><span className="font-bold text-lg block">{response.summary.errors}</span> errors</span>
                                            <span className="text-sky-300"><span className="font-bold text-lg block">{response.summary.totalProjects}</span> total</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                    <h3 className="text-sm font-bold text-red-300 mb-1">Review Required</h3>
                                    <p className="text-xs text-red-200">{response.message || 'The import contains blocking issues and must be fixed before approval.'}</p>
                                </div>
                            )}

                            {response.preview && (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                        <h4 className="text-sm font-semibold text-white/80 mb-3">Project Status</h4>
                                        <div className="space-y-2">
                                            {response.preview.projects.map((project, index) => (
                                                <div key={`${project.name}-${index}`} className="rounded-lg border border-white/[0.06] bg-black/10 p-3">
                                                    <div className="flex items-center justify-between gap-3 pb-2">
                                                        <span className="text-sm font-medium text-white/85">{project.name || 'Unnamed project'}</span>
                                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${project.validation.state === 'READY' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : project.validation.state === 'BLOCKED' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'}`}>
                                                            {project.validation.state}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-white/45 space-y-1">
                                                        <p>Developer: {project.developer ? `${project.developer.name} (${project.developer.slug})` : 'Missing'}</p>
                                                        <p>Location: {project.city || 'Unknown'} / {project.community || 'Unknown'} / {project.countryIso2 || 'Unknown'}</p>
                                                        <p>Start price: {project.startingPrice ?? 'N/A'}</p>
                                                    </div>
                                                    {project.validation.errors.length > 0 && (
                                                        <div className="mt-2 text-[11px] text-red-300">
                                                            Errors: {project.validation.errors.join(', ')}
                                                        </div>
                                                    )}
                                                    {project.validation.warnings.length > 0 && (
                                                        <div className="mt-2 text-[11px] text-yellow-300">
                                                            Warnings: {project.validation.warnings.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {response.preview.warnings.length > 0 && (
                                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                                            <h4 className="text-sm font-semibold text-yellow-200 mb-2">Warnings</h4>
                                            <ul className="list-disc pl-5 text-xs text-yellow-100/80 space-y-1">
                                                {response.preview.warnings.map((warning, idx) => <li key={`${warning}-${idx}`}>{warning}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {response.preview.errors.length > 0 && (
                                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                            <h4 className="text-sm font-semibold text-red-200 mb-2">Blocking Issues</h4>
                                            <ul className="list-disc pl-5 text-xs text-red-100/80 space-y-1">
                                                {response.preview.errors.map((error, idx) => <li key={`${error}-${idx}`}>{error}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
