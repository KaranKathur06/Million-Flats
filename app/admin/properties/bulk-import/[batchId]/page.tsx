'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

type ImportRecord = {
    id: string
    sourceRecordId: string
    sourceRow: number | null
    status: string
    commitAction?: string | null
    rawPayload: unknown
    normalizedPayload: unknown
    canonicalPayload: unknown
    targetEntityId: string | null
}

type ImportBatch = {
    id: string
    originalFileName: string
    status: string
    mode: string
    entityType: string
    totalRecords: number
    readyCount: number
    warningCount: number
    errorCount: number
    createdCount: number
    failedCount: number
    updatedCount?: number
    skippedCount?: number
    createdAt: string
    records: ImportRecord[]
    issues: Array<{ id: string; severity: string; stage: string; message: string; resolutionState: string }>
}

const STATUS_STYLES: Record<string, string> = {
    READY: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    WARNING: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    ERROR: 'border-red-400/20 bg-red-400/10 text-red-300',
    COMMITTED: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    SKIPPED: 'border-white/10 bg-white/[0.05] text-white/50',
}

export default function ImportBatchDetailPage() {
    const params = useParams<{ batchId: string }>()
    const batchId = params?.batchId || ''
    const [batch, setBatch] = useState<ImportBatch | null>(null)
    const [loading, setLoading] = useState(true)
    const [committing, setCommitting] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [rollingBack, setRollingBack] = useState(false)

    const loadBatch = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}`, { cache: 'no-store' })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load import batch.')
            setBatch({ ...payload.batch, records: Array.isArray(payload.batch?.records) ? payload.batch.records : [], issues: Array.isArray(payload.batch?.issues) ? payload.batch.issues : [] })
        } catch (error: any) {
            toast.error(error.message || 'Unable to load import batch.')
        } finally {
            setLoading(false)
        }
    }, [batchId])

    useEffect(() => { void loadBatch() }, [loadBatch])

    const commitBatch = async () => {
        setCommitting(true)
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/commit`, {
                method: 'POST',
                headers: { 'Idempotency-Key': `admin-${Date.now()}` },
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Commit failed.')
            toast.success(`Batch committed: ${payload.created} created, ${payload.failed} failed`)
            await loadBatch()
        } catch (error: any) {
            toast.error(error.message || 'Commit failed.')
        } finally {
            setCommitting(false)
        }
    }

    const cancelBatch = async () => {
        setCancelling(true)
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/cancel`, { method: 'POST' })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Cancellation failed.')
            toast.success('Import batch cancelled.')
            await loadBatch()
        } catch (error: any) {
            toast.error(error.message || 'Cancellation failed.')
        } finally {
            setCancelling(false)
        }
    }

    const resetAnalysis = async () => {
        setResetting(true)
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/invalidate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ change: 'mapping' }),
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to reset analysis.')
            const analysisResponse = await fetch(`/api/admin/bulk-import/${batchId}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            const analysisPayload = await analysisResponse.json()
            if (!analysisResponse.ok || !analysisPayload.success) throw new Error(analysisPayload.message || 'Unable to re-run analysis.')
            toast.success('Analysis refreshed.')
            await loadBatch()
        } catch (error: any) {
            toast.error(error.message || 'Unable to reset analysis.')
        } finally {
            setResetting(false)
        }
    }

    const rollbackBatch = async () => {
        if (!window.confirm(`Rollback newly created ${entityLabel}s from this batch? This cannot be undone.`)) return
        setRollingBack(true)
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/rollback`, { method: 'POST' })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Rollback failed.')
            toast.success(`${payload.rolledBack} ${entityLabel}(s) rolled back.`)
            await loadBatch()
        } catch (error: any) {
            toast.error(error.message || 'Rollback failed.')
        } finally {
            setRollingBack(false)
        }
    }

    if (loading) return <div className="p-8 text-sm text-white/50">Loading import batch...</div>
    if (!batch) return <div className="p-8 text-sm text-red-300">Import batch could not be loaded.</div>

    const canCommit = batch.status === 'READY_TO_COMMIT' || batch.status === 'READY_FOR_REVIEW'
    const entityLabel = batch.entityType === 'DEVELOPER' ? 'developer' : batch.entityType === 'PROJECT' ? 'project' : batch.entityType === 'ECOSYSTEM_PARTNER' ? 'ecosystem partner' : batch.entityType === 'AGENCY' ? 'agency' : batch.entityType === 'AGENT' ? 'agent' : batch.entityType === 'LEAD' ? 'lead' : 'property'
    const recordLabel = (record: ImportRecord) => {
        const value = record.canonicalPayload as any || record.normalizedPayload as any || record.rawPayload as any || {}
        return String(value.name || value.title || value.company_name || value['Developer  Name'] || value.email || record.sourceRecordId)
    }
    const jsonText = (value: unknown) => JSON.stringify(value ?? {}, null, 2)

    return (
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
            <Toaster position="top-right" />
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link href="/admin/properties/bulk-import" className="text-xs text-white/40 hover:text-amber-300">Back to bulk import</Link>
                    <h1 className="mt-3 text-2xl font-semibold text-white">Import review</h1>
                    <p className="mt-1 text-sm text-white/45">{batch.originalFileName} · {batch.mode} · {batch.status}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => void loadBatch()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06]">Refresh</button>
                    {batch.status === 'READY_FOR_REVIEW' && (
                        <button type="button" onClick={() => void resetAnalysis()} disabled={resetting || committing || cancelling} className="rounded-lg border border-sky-400/20 px-3 py-2 text-xs text-sky-300 disabled:cursor-not-allowed disabled:opacity-40">
                            {resetting ? 'Resetting...' : 'Reset analysis'}
                        </button>
                    )}
                    {batch.status !== 'COMMITTED' && batch.status !== 'PARTIALLY_COMMITTED' && batch.status !== 'FAILED' && batch.status !== 'CANCELLED' && (
                        <button type="button" onClick={() => void cancelBatch()} disabled={cancelling || committing} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40">
                            {cancelling ? 'Cancelling...' : 'Cancel batch'}
                        </button>
                    )}
                    {canCommit && (
                        <button type="button" onClick={() => void commitBatch()} disabled={committing || batch.status !== 'READY_TO_COMMIT'} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
                            {committing ? 'Committing...' : 'Commit ready records'}
                        </button>
                    )}
                    {(batch.status === 'COMMITTED' || batch.status === 'PARTIALLY_COMMITTED') && batch.records.some((record) => record.commitAction === 'created') && (
                        <button type="button" onClick={() => void rollbackBatch()} disabled={rollingBack} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40">
                            {rollingBack ? 'Rolling back...' : 'Rollback drafts'}
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-7">
                {[
                    ['Source records', batch.totalRecords],
                    ['Ready to commit', batch.readyCount],
                    ['Warnings', batch.warningCount],
                    ['Errors', batch.errorCount],
                    ['Created', batch.createdCount],
                    ['Updated', batch.updatedCount ?? 0],
                    ['Skipped', batch.skippedCount ?? 0],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                    </div>
                ))}
            </div>
            <p className="mb-6 text-xs text-white/40">Ready to commit means the record passed validation. Created counts new {entityLabel}s; updated counts existing records changed; skipped counts duplicates or records intentionally not created.</p>

            {batch.issues.length > 0 && (
                <section className="mb-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
                    <h2 className="text-sm font-semibold text-amber-200">Review issues</h2>
                    <div className="mt-3 space-y-2">
                        {batch.issues.map((issue) => (
                            <div key={issue.id} className="border-l border-amber-300/30 pl-3 text-xs text-white/60">
                                <span className="mr-2 text-amber-300">{issue.severity}</span>{issue.message}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <div className="border-b border-white/[0.07] px-5 py-4">
                    <h2 className="text-sm font-semibold text-white/80">Records</h2>
                </div>
                <div className="divide-y divide-white/[0.06]">
                    {batch.records.map((record, index) => (
                        <details key={record.id} className="group px-5 py-4">
                            <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[120px_1fr_140px_120px] md:items-center">
                                <span className="text-xs text-white/45">Record {index + 1} <span className="text-white/25">· source row {record.sourceRow ?? '-'}</span></span>
                                <div className="min-w-0"><p className="truncate text-sm text-white/80">{recordLabel(record)}</p><p className="mt-1 truncate text-[11px] text-white/35">Source ID: {record.sourceRecordId}</p></div>
                                <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_STYLES[record.status] || STATUS_STYLES.SKIPPED}`}>{record.status}</span>
                                <span className="text-xs text-white/35">{record.targetEntityId ? 'Linked' : 'Not linked'}</span>
                            </summary>
                            <div className="mt-4 grid gap-4 border-t border-white/[0.06] pt-4 lg:grid-cols-3">
                                {([ 
                                    ['Source', record.rawPayload],
                                    ['Normalized', record.normalizedPayload],
                                    ['Canonical', record.canonicalPayload],
                                ] as Array<[string, unknown]>).map(([label, value]) => <div key={label} className="min-w-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{label}</p><pre className="max-h-64 overflow-auto rounded-lg border border-white/[0.07] bg-black/20 p-3 text-[11px] leading-5 text-white/60">{jsonText(value)}</pre></div>)}
                            </div>
                        </details>
                    ))}
                </div>
            </section>
        </div>
    )
}
