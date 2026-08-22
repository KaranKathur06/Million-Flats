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
    skippedCount: number
    failedCount: number
    createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
    COMMITTED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    PARTIALLY_COMMITTED: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    READY_FOR_REVIEW: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    READY_TO_COMMIT: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    FAILED: 'border-red-400/20 bg-red-400/10 text-red-300',
}

export default function ImportHistoryPage() {
    const [batches, setBatches] = useState<ImportBatchSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/bulk-import', { cache: 'no-store' })
            .then(async (response) => {
                const payload = await response.json()
                if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load import history.')
                setBatches(payload.batches)
            })
            .catch((error) => toast.error(error.message || 'Unable to load import history.'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
            <Toaster position="top-right" />
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Link href="/admin/properties/bulk-import" className="text-xs text-white/40 hover:text-amber-300">Back to bulk import</Link>
                    <h1 className="mt-3 text-2xl font-semibold text-white">Import history</h1>
                    <p className="mt-1 text-sm text-white/45">Review property batches, unresolved issues, and commit outcomes.</p>
                </div>
                <Link href="/admin/properties/bulk-import" className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-black">New import</Link>
            </div>

            <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <div className="hidden grid-cols-[1fr_130px_90px_180px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid">
                    <span>Batch</span><span>Status</span><span>Records</span><span>Outcome</span>
                </div>
                {loading ? (
                    <div className="px-5 py-12 text-center text-sm text-white/40">Loading import history...</div>
                ) : batches.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-white/40">No property imports yet.</div>
                ) : (
                    <div className="divide-y divide-white/[0.06]">
                        {batches.map((batch) => (
                            <Link key={batch.id} href={`/admin/properties/bulk-import/${batch.id}`} className="grid gap-3 px-5 py-4 transition-colors hover:bg-white/[0.035] md:grid-cols-[1fr_130px_90px_180px] md:items-center md:gap-4">
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-white/80">{batch.originalFileName}</p>
                                    <p className="mt-1 text-[11px] text-white/35">{new Date(batch.createdAt).toLocaleString()} · {batch.mode}</p>
                                </div>
                                <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLES[batch.status] || 'border-white/10 bg-white/[0.05] text-white/50'}`}>{batch.status.replaceAll('_', ' ')}</span>
                                <span className="text-sm text-white/60">{batch.totalRecords}</span>
                                <span className="text-xs text-white/45">{batch.createdCount} created · {batch.skippedCount} skipped · {batch.failedCount} failed</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
