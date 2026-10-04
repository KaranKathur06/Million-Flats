'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

type ImportBatchSummary = {
    id: string
    originalFileName: string
    status: string
    mode: string
    totalRecords: number
    readyCount: number
    warningCount: number
    errorCount: number
    createdCount: number
    updatedCount: number
    skippedCount: number
    failedCount: number
    createdAt: string
    entityType: string
    remainingCount: number
    retryableCount: number
    fullyCommitted: boolean
    staleCommit: boolean
    canContinue: boolean
}

const STATUS_STYLES: Record<string, string> = {
    COMMITTED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    PARTIALLY_COMMITTED: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    READY_FOR_REVIEW: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    READY_TO_COMMIT: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    COMMITTING: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    FAILED: 'border-red-400/20 bg-red-400/10 text-red-300',
}

export default function ImportHistoryPage() {
    const [batches, setBatches] = useState<ImportBatchSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        fetch('/api/admin/bulk-import', { cache: 'no-store' })
            .then(async (response) => {
                const payload = await response.json()
                if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load import history.')
                setBatches(Array.isArray(payload.batches) ? payload.batches : [])
                setLoadError('')
            })
            .catch((error) => {
                const message = error.message || 'Unable to load import history.'
                setLoadError(message)
                toast.error(message)
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
            <Toaster position="top-right" />
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Link href="/admin/properties/bulk-import" className="text-xs text-white/40 hover:text-amber-300">Back to bulk import</Link>
                    <h1 className="mt-3 text-2xl font-semibold text-white">Import history</h1>
                    <p className="mt-1 text-sm text-white/45">Review property and project batches, continue interrupted imports, and inspect commit outcomes.</p>
                </div>
                <Link href="/admin/properties/bulk-import" className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-black">New import</Link>
            </div>

            <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <div className="hidden grid-cols-[1fr_130px_90px_280px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid">
                    <span>Batch</span><span>Status</span><span>Records</span><span>Outcome</span>
                </div>
                {loading ? (
                    <div className="px-5 py-12 text-center text-sm text-white/40">Loading import history...</div>
                ) : loadError ? (
                    <div className="px-5 py-12 text-center text-sm text-red-300">{loadError}</div>
                ) : batches.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-white/40">No imports yet.</div>
                ) : (
                    <div className="divide-y divide-white/[0.06]">
                        {batches.map((batch) => (
                            <div key={batch.id} className="grid gap-3 px-5 py-4 transition-colors hover:bg-white/[0.035] md:grid-cols-[1fr_130px_90px_280px] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    <Link href={`/admin/properties/bulk-import/${batch.id}`} className="truncate text-sm text-white/80 hover:text-amber-300">{batch.originalFileName}</Link>
                                    <p className="mt-1 text-[11px] text-white/35">{new Date(batch.createdAt).toLocaleString()} · {batch.entityType.replaceAll('_', ' ')} · {batch.mode}</p>
                                </div>
                                <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLES[batch.status] || 'border-white/10 bg-white/[0.05] text-white/50'}`}>{batch.status.replaceAll('_', ' ')}</span>
                                <span className="text-sm text-white/60">{batch.totalRecords}</span>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-white/45">{batch.createdCount} created · {batch.updatedCount} updated · {batch.skippedCount} skipped · {batch.failedCount} failed</p>
                                        {batch.canContinue && (
                                            <p className="mt-1 text-[11px] text-white/35">
                                                {batch.fullyCommitted
                                                    ? 'All records committed; batch summary needs finalizing.'
                                                    : `${batch.remainingCount} remaining · ${batch.retryableCount} failed/retryable`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <Link
                                            href={`/admin/bulk-import/${batch.id}`}
                                            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/30 hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                                        >
                                            Review batch
                                        </Link>
                                        {batch.canContinue && (
                                            <Link
                                                href={`/admin/properties/bulk-import/${batch.id}`}
                                                className="rounded-lg border border-amber-400/25 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                                            >
                                                {batch.fullyCommitted ? 'Finalize completed import' : batch.staleCommit ? 'Recover & continue' : 'Continue import'}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
