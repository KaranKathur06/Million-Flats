'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'

type Step = 'setup' | 'upload' | 'discovery' | 'review' | 'result'

const steps: Array<{ id: Step; label: string; number: string }> = [
    { id: 'setup', label: 'Configure', number: '01' },
    { id: 'upload', label: 'Upload source', number: '02' },
    { id: 'discovery', label: 'Discover fields', number: '03' },
    { id: 'review', label: 'Review batch', number: '04' },
    { id: 'result', label: 'Complete', number: '05' },
]

const DEMO_JSON = JSON.stringify({
    schemaVersion: 'property-import-v1',
    properties: [{
        title: 'Harbour View Residence', propertyType: 'Apartment', intent: 'SALE', price: 2850000, currency: 'AED',
        bedrooms: 3, bathrooms: 2, squareFeet: 1840, countryCode: 'UAE', countryIso2: 'AE', city: 'Dubai', community: 'Dubai Marina',
        sourceProvider: 'DEMO_PORTAL', sourceListingId: 'demo-001', sourceUrl: 'https://example.com/demo-001',
    }],
}, null, 2)

const statusTone: Record<string, string> = {
    READY_FOR_REVIEW: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
    READY_TO_COMMIT: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
    COMMITTED: 'text-sky-300 bg-sky-300/10 border-sky-300/20',
    FAILED: 'text-red-300 bg-red-300/10 border-red-300/20',
    CANCELLED: 'text-white/50 bg-white/[0.06] border-white/10',
}

export default function ImportCenterPage() {
    const [step, setStep] = useState<Step>('setup')
    const [entity, setEntity] = useState('PROPERTY')
    const [operation, setOperation] = useState('CREATE')
    const [mode, setMode] = useState('PARTIAL')
    const [agentId, setAgentId] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [batchId, setBatchId] = useState('')
    const [discovery, setDiscovery] = useState<any>(null)
    const [batch, setBatch] = useState<any>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const currentIndex = steps.findIndex((item) => item.id === step)
    const sourcePreview = useMemo(() => file ? `${(file.size / 1024).toFixed(1)} KB` : 'No source selected', [file])

    const loadDemo = useCallback(() => {
        const demo = new File([DEMO_JSON], 'demo-properties.json', { type: 'application/json' })
        setFile(demo)
        setError('')
        setStep('upload')
    }, [])

    const uploadSource = async () => {
        if (!file) return setError('Choose a CSV or JSON source file first.')
        if (!agentId.trim()) return setError('An existing Agent ID is required for ownership.')
        setBusy(true); setError('')
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('operation', operation)
            form.append('mode', mode)
            form.append('sourceProvider', 'ADMIN_IMPORT')
            const response = await fetch('/api/admin/bulk-import', { method: 'POST', body: form })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Upload failed.')
            setBatchId(payload.batchId)
            setDiscovery(payload.discovery)
            setStep('discovery')
            toast.success('Source uploaded and staged.')
        } catch (value: any) { setError(value.message || 'Upload failed.') }
        finally { setBusy(false) }
    }

    const analyze = async () => {
        setBusy(true); setError('')
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/analyze`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerAgentId: agentId }),
            })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Analysis failed.')
            await loadBatch()
            setStep('review')
        } catch (value: any) { setError(value.message || 'Analysis failed.') }
        finally { setBusy(false) }
    }

    const loadBatch = async () => {
        const response = await fetch(`/api/admin/bulk-import/${batchId}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load batch.')
        setBatch(payload.batch)
    }

    const commit = async () => {
        setBusy(true); setError('')
        try {
            const response = await fetch(`/api/admin/bulk-import/${batchId}/commit`, { method: 'POST', headers: { 'Idempotency-Key': `admin-${Date.now()}` } })
            const payload = await response.json()
            if (!response.ok || !payload.success) throw new Error(payload.message || 'Commit failed.')
            setBatch(payload); setStep('result'); toast.success('Import committed.')
        } catch (value: any) { setError(value.message || 'Commit failed.') }
        finally { setBusy(false) }
    }

    const goBack = () => {
        if (step === 'upload') setStep('setup')
        if (step === 'discovery') setStep('upload')
        if (step === 'review') setStep('discovery')
    }

    return (
        <div className="min-h-full bg-[#080e1a] text-white">
            <Toaster position="top-right" toastOptions={{ style: { background: '#111a2a', color: '#fff', border: '1px solid rgba(255,255,255,.1)' } }} />
            <div className="mx-auto max-w-[1180px] px-6 py-8 lg:px-10">
                <header className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 md:flex-row md:items-end">
                    <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">Operations / Data intake</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">Import Center</h1>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Bring property data into the MillionFlats catalog with a visible, reviewable path from source file to live record.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/bulk-import/history" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06]">History</Link>
                        <Link href="/admin/bulk-import/templates" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06]">Templates</Link>
                    </div>
                </header>

                <nav className="my-8 grid grid-cols-5 gap-2" aria-label="Import progress">
                    {steps.map((item, index) => {
                        const active = index === currentIndex
                        const done = index < currentIndex
                        return <div key={item.id} className={`relative border-t-2 pt-3 ${active ? 'border-amber-300' : done ? 'border-emerald-400/60' : 'border-white/10'}`}>
                            <span className={`text-[10px] font-semibold tracking-[0.2em] ${active ? 'text-amber-300' : done ? 'text-emerald-300' : 'text-white/25'}`}>{item.number}</span>
                            <p className={`mt-1 text-xs ${active ? 'text-white' : 'text-white/40'}`}>{item.label}</p>
                        </div>
                    })}
                </nav>

                {error && <div className="mb-6 flex items-center justify-between rounded-lg border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200"><span>{error}</span><button type="button" onClick={() => setError('')} className="text-red-200/60">Dismiss</button></div>}

                <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <section className="min-h-[470px] rounded-2xl border border-white/[0.08] bg-[#0d1625] p-6 shadow-2xl shadow-black/20 lg:p-8">
                        {step === 'setup' && <>
                            <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Step 01</p><h2 className="mt-2 text-xl font-semibold">Configure this import</h2><p className="mt-2 text-sm text-white/45">Choose the destination and ownership policy before selecting a source.</p></div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <label><span className="label">Entity</span><select value={entity} onChange={e => setEntity(e.target.value)} className="field"><option value="PROPERTY">Properties</option></select></label>
                                <label><span className="label">Operation</span><select value={operation} onChange={e => setOperation(e.target.value)} className="field"><option>CREATE</option><option>UPSERT</option><option>UPDATE</option></select></label>
                                <label><span className="label">Import mode</span><select value={mode} onChange={e => setMode(e.target.value)} className="field"><option value="PARTIAL">Partial · commit valid records</option><option value="STRICT">Strict · resolve every issue</option></select></label>
                                <label><span className="label">Existing Agent ID</span><input value={agentId} onChange={e => setAgentId(e.target.value)} className="field" placeholder="Required ownership ID" /></label>
                            </div>
                            <div className="mt-8 flex justify-end"><button type="button" onClick={() => { setError(''); setStep('upload') }} className="button-primary">Continue to upload <span>→</span></button></div>
                        </>}

                        {step === 'upload' && <>
                            <div className="mb-8 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Step 02</p><h2 className="mt-2 text-xl font-semibold">Upload source file</h2><p className="mt-2 text-sm text-white/45">CSV and JSON are parsed server-side. Nothing is committed at upload.</p></div><button type="button" onClick={loadDemo} className="button-quiet">Load demo</button></div>
                            <label className="flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-300/30 bg-amber-300/[0.035] px-6 text-center hover:bg-amber-300/[0.06]">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-2xl text-amber-300">↑</span>
                                <span className="mt-4 text-sm font-medium text-white/80">{file ? file.name : 'Drop a source file here'}</span>
                                <span className="mt-2 text-xs text-white/35">{file ? sourcePreview : 'CSV or JSON · up to 10 MB'}</span>
                                <input type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                            </label>
                            <div className="mt-8 flex justify-between"><button type="button" onClick={goBack} className="button-quiet">Back</button><button type="button" onClick={() => void uploadSource()} disabled={busy || !file} className="button-primary disabled:opacity-40">{busy ? 'Staging…' : 'Stage source'} <span>→</span></button></div>
                        </>}

                        {step === 'discovery' && <>
                            <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Step 03</p><h2 className="mt-2 text-xl font-semibold">Discovery complete</h2><p className="mt-2 text-sm text-white/45">Review what the parser found before canonical mapping begins.</p></div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Format', discovery?.format?.toUpperCase() || 'FILE'], ['Records', discovery?.recordCount ?? '—'], ['Fields', discovery?.fields?.length ?? '—'], ['Encoding', discovery?.encoding || 'UTF-8']].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>)}</div>
                            <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#101b2c] p-5"><p className="text-xs font-semibold text-white/70">Detected fields</p><div className="mt-4 flex flex-wrap gap-2">{(discovery?.fields || []).map((field: string) => <span key={field} className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[11px] text-white/55">{field}</span>)}</div></div>
                            <div className="mt-8 flex justify-between"><button type="button" onClick={goBack} className="button-quiet">Back</button><button type="button" onClick={() => void analyze()} disabled={busy} className="button-primary disabled:opacity-40">{busy ? 'Analyzing…' : 'Analyze & review'} <span>→</span></button></div>
                        </>}

                        {step === 'review' && <>
                            <div className="mb-8 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Step 04</p><h2 className="mt-2 text-xl font-semibold">Review batch</h2><p className="mt-2 text-sm text-white/45">Confirm the staged records and resolve issues before commit.</p></div><span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase ${statusTone[batch?.status] || statusTone.READY_FOR_REVIEW}`}>{batch?.status?.replaceAll('_', ' ')}</span></div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[['Total', batch?.totalRecords], ['Ready', batch?.readyCount], ['Warnings', batch?.warningCount], ['Errors', batch?.errorCount], ['Mapping', batch?.mappingVersion]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</p><p className="mt-2 text-xl font-semibold">{value ?? '—'}</p></div>)}</div>
                            <div className="mt-6 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-sm text-white/60"><span className="font-medium text-amber-200">Ownership locked:</span> records will be created under the existing Agent ID configured for this import.</div>
                            <div className="mt-8 flex justify-between"><Link href={`/admin/bulk-import/${batchId}`} className="button-quiet">Open detailed review</Link><button type="button" onClick={() => void commit()} disabled={busy || batch?.status !== 'READY_TO_COMMIT'} className="button-primary disabled:opacity-40">{busy ? 'Committing…' : 'Commit ready records'} <span>→</span></button></div>
                        </>}

                        {step === 'result' && <>
                            <div className="flex min-h-[390px] flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-3xl text-emerald-300">✓</div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Import complete</p><h2 className="mt-2 text-2xl font-semibold">Your records are processed</h2><p className="mt-3 max-w-md text-sm leading-6 text-white/45">The import result is persisted and linked to the existing property workflows.</p><div className="mt-8 flex gap-3"><Link href="/admin/properties" className="button-primary">View properties</Link><Link href="/admin/bulk-import/history" className="button-quiet">View history</Link></div></div>
                        </>}
                    </section>

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1625] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Import contract</p><div className="mt-5 space-y-4">{[['Destination', entity === 'PROPERTY' ? 'Property catalog' : entity], ['Ownership', agentId ? 'Agent selected' : 'Needs Agent ID'], ['Mode', mode === 'STRICT' ? 'All issues block' : 'Valid records proceed'], ['Source', file?.name || 'Waiting for file']].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"><span className="text-xs text-white/35">{label}</span><span className="text-right text-xs text-white/70">{value}</span></div>)}</div></div>
                        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5"><p className="text-xs font-semibold text-amber-200">Safe by design</p><p className="mt-2 text-xs leading-5 text-white/45">Files are staged first. Canonical validation, ownership checks, and duplicate detection happen before a record is created.</p></div>
                    </aside>
                </main>
            </div>
            <style jsx global>{`.label{display:block;margin-bottom:.5rem;font-size:.75rem;font-weight:500;color:rgba(255,255,255,.55)}.field{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:.65rem;background:#111c2d;padding:.7rem .8rem;font-size:.8rem;color:rgba(255,255,255,.8);outline:0}.field:focus{border-color:rgba(252,211,77,.55);box-shadow:0 0 0 3px rgba(252,211,77,.08)}.button-primary{display:inline-flex;align-items:center;gap:.7rem;border-radius:.65rem;background:#f6c945;padding:.72rem 1rem;font-size:.75rem;font-weight:700;color:#10151d;transition:background .2s}.button-primary:hover{background:#f8d66b}.button-quiet{display:inline-flex;align-items:center;border-radius:.65rem;border:1px solid rgba(255,255,255,.1);padding:.7rem .9rem;font-size:.75rem;color:rgba(255,255,255,.58);transition:background .2s}.button-quiet:hover{background:rgba(255,255,255,.06)}`}</style>
        </div>
    )
}
