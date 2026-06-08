'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DeveloperForm from '@/components/admin/DeveloperForm'

type Mode = 'manual' | 'json'
type UploadMode = 'skip' | 'update'

interface BulkResultItem {
  name: string
  status: 'created' | 'updated' | 'restored' | 'skipped' | 'error'
  slug?: string
  reason?: string
}

export default function AdminAddDeveloperPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('manual')

  // JSON mode state
  const [jsonText, setJsonText] = useState('')
  const [jsonPreview, setJsonPreview] = useState<any[] | null>(null)
  const [jsonErrors, setJsonErrors] = useState<string[]>([])
  const [bulkResults, setBulkResults] = useState<BulkResultItem[] | null>(null)
  const [uploadMode, setUploadMode] = useState<UploadMode>('skip')
  const [restoreDeleted, setRestoreDeleted] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── JSON Mode Handlers ──────────────────────────────
  const validateJson = useCallback((text: string) => {
    setJsonErrors([])
    setJsonPreview(null)
    setBulkResults(null)

    if (!text.trim()) return

    try {
      const parsed = JSON.parse(text)
      let devArray: any[]

      if (Array.isArray(parsed)) {
        devArray = parsed
      } else if (parsed.developers && Array.isArray(parsed.developers)) {
        devArray = parsed.developers
      } else {
        setJsonErrors(['JSON must be an array or contain a "developers" array'])
        return
      }

      const errors: string[] = []
      devArray.forEach((dev, i) => {
        if (!dev.name || typeof dev.name !== 'string' || !dev.name.trim()) {
          errors.push(`Developer #${i + 1}: Name is required`)
        }
        if (dev.country && !['India', 'UAE', 'INDIA', 'india', 'uae'].includes(dev.country)) {
          errors.push(`Developer #${i + 1}: Country must be "India" or "UAE"`)
        }
        if (dev.website && typeof dev.website === 'string' && dev.website.trim() && !dev.website.startsWith('http')) {
          errors.push(`Developer #${i + 1}: Website must start with http:// or https://`)
        }
      })

      if (errors.length > 0) {
        setJsonErrors(errors)
      } else {
        setJsonPreview(devArray)
      }
    } catch {
      setJsonErrors(['Invalid JSON format. Please check your syntax.'])
    }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setJsonText(text)
      validateJson(text)
    }
    reader.readAsText(file)
  }

  const handleBulkSubmit = async () => {
    if (!jsonPreview || jsonPreview.length === 0) return
    setSaving(true)
    setError('')
    setSuccess('')
    setBulkResults(null)

    try {
      const payload = { developers: jsonPreview, mode: uploadMode, restoreDeleted }
      const res = await fetch('/api/admin/developers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Bulk upload failed')
      setBulkResults(json.results || [])
      setSuccess(json.message || 'Bulk upload complete')
    } catch (err: any) {
      setError(err.message || 'Bulk upload failed')
    } finally {
      setSaving(false)
    }
  }

  const loadSampleJson = () => {
    const sample = JSON.stringify(
      {
        developers: [
          {
            name: 'Example Developer',
            country: 'UAE',
            city: 'Dubai',
            slug: 'example-developer',
            website: 'https://example.com',
            description: 'A sample developer description.',
            short_description: 'Sample developer',
            is_featured: false,
            status: 'active',
          },
        ],
      },
      null,
      2
    )
    setJsonText(sample)
    validateJson(sample)
  }

  return (
    <div className="max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/admin/developers"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Developers
          </Link>
          <span className="text-white/20 text-xs">/</span>
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            New
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Add Developer</h1>
        <p className="mt-1 text-sm text-white/40">Create developer profiles manually or via JSON bulk upload</p>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            mode === 'manual'
              ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
              : 'text-white/40 hover:text-white/60 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Manual Entry
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('json')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            mode === 'json'
              ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
              : 'text-white/40 hover:text-white/60 border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            JSON Upload
          </span>
        </button>
      </div>

      {/* ─────────────── MANUAL MODE ─────────────── */}
      {mode === 'manual' && <DeveloperForm isEditMode={false} />}

      {/* ─────────────── JSON MODE ─────────────── */}
      {mode === 'json' && (
        <div className="space-y-6 pb-12">
          {/* Feedback */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-3">JSON Format</h3>
            <p className="text-sm text-white/40 mb-3">
              Paste JSON or upload a <code className="text-amber-300/80 bg-white/[0.06] px-1.5 py-0.5 rounded">.json</code> file.
              Structure must be <code className="text-amber-300/80 bg-white/[0.06] px-1.5 py-0.5 rounded">{`{ "developers": [...] }`}</code> or a plain array.
            </p>
            <button type="button" onClick={loadSampleJson} className="text-amber-300 text-xs font-semibold hover:text-amber-200 transition-colors underline underline-offset-2">
              Load sample JSON →
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Upload Mode</h3>

            <div className="flex flex-wrap gap-2">
              {([
                { key: 'skip', label: 'Skip Duplicates' },
                { key: 'update', label: 'Update Existing' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setUploadMode(item.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    uploadMode === item.key
                      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                      : 'bg-white/[0.02] text-white/45 border-white/[0.08] hover:text-white/70'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-white/65">
              <input
                type="checkbox"
                checked={restoreDeleted}
                onChange={(e) => setRestoreDeleted(e.target.checked)}
                className="accent-amber-400"
              />
              Restore soft-deleted developers when detected
            </label>
          </div>

          {/* JSON Input */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Paste JSON</label>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload File
                </button>
              </div>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); validateJson(e.target.value) }}
              rows={16}
              placeholder={'{\n  "developers": [\n    {\n      "name": "Developer Name",\n      "country": "UAE",\n      "city": "Dubai"\n    }\n  ]\n}'}
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white/80 placeholder-white/15 outline-none focus:border-amber-400/30 font-mono resize-none"
              spellCheck={false}
            />
          </div>

          {/* JSON Validation Errors */}
          {jsonErrors.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <h4 className="text-sm font-bold text-red-300 mb-2">Validation Errors ({jsonErrors.length})</h4>
              <ul className="space-y-1">
                {jsonErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* JSON Preview Table */}
          {jsonPreview && jsonPreview.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h4 className="text-sm font-bold text-white/70">
                  Preview ({jsonPreview.length} developer{jsonPreview.length > 1 ? 's' : ''})
                </h4>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Valid JSON
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">#</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Name</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Country</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">City</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jsonPreview.map((dev, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-white/30 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-white/80 font-medium">{dev.name}</td>
                        <td className="px-4 py-2.5 text-white/50">{dev.country || 'UAE'}</td>
                        <td className="px-4 py-2.5 text-white/50">{dev.city || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            (dev.status || 'active').toLowerCase() === 'active'
                              ? 'bg-emerald-400/15 text-emerald-300'
                              : 'bg-red-400/15 text-red-300'
                          }`}>
                            {dev.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk Results */}
          {bulkResults && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h4 className="text-sm font-bold text-white/70">Upload Results</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Name</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Status</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Slug</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/30">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r, i) => (
                      <tr key={i} className="border-b border-white/[0.04]">
                        <td className="px-4 py-2.5 text-white/80 font-medium">{r.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            r.status === 'created' ? 'bg-emerald-400/15 text-emerald-300' :
                            r.status === 'updated' ? 'bg-blue-400/15 text-blue-300' :
                            r.status === 'restored' ? 'bg-cyan-400/15 text-cyan-300' :
                            r.status === 'skipped' ? 'bg-amber-400/15 text-amber-300' :
                            'bg-red-400/15 text-red-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-white/40 font-mono text-xs">{r.slug || '—'}</td>
                        <td className="px-4 py-2.5 text-white/30 text-xs">{r.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bulk Submit */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={saving || !jsonPreview || jsonPreview.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Uploading…
                </>
              ) : (
                <>Upload {jsonPreview?.length || 0} Developer{(jsonPreview?.length || 0) > 1 ? 's' : ''}</>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/developers')}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
