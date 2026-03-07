'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface DevOption { id: string; name: string; slug: string | null }
interface MediaItem { id: string; mediaUrl: string; mediaType: string; sortOrder: number | null; s3Key: string | null }
interface UnitTypeRow { unitType: string; sizeFrom: string; sizeTo: string; priceFrom: string }

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    ARCHIVED: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
}

export default function AdminEditProjectPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params?.id as string

    const [developers, setDevelopers] = useState<DevOption[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Project data
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [developerId, setDeveloperId] = useState('')
    const [city, setCity] = useState('')
    const [community, setCommunity] = useState('')
    const [countryIso2, setCountryIso2] = useState('AE')
    const [description, setDescription] = useState('')
    const [completionYear, setCompletionYear] = useState('')
    const [startingPrice, setStartingPrice] = useState('')
    const [goldenVisa, setGoldenVisa] = useState(false)
    const [coverImage, setCoverImage] = useState('')
    const [status, setStatus] = useState('DRAFT')
    const [leadCount, setLeadCount] = useState(0)

    // Media
    const [media, setMedia] = useState<MediaItem[]>([])
    const [uploading, setUploading] = useState(false)

    // Unit types
    const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([])

    const loadProject = useCallback(async () => {
        setLoading(true)
        try {
            const [projRes, devRes] = await Promise.all([
                fetch(`/api/admin/projects/${projectId}`),
                fetch('/api/admin/developers'),
            ])
            const projJson = await projRes.json()
            const devJson = await devRes.json()

            if (devJson.success) setDevelopers(devJson.items || [])

            if (!projJson.success) throw new Error(projJson.message || 'Not found')
            const p = projJson.project

            setName(p.name || '')
            setSlug(p.slug || '')
            setDeveloperId(p.developerId || '')
            setCity(p.city || '')
            setCommunity(p.community || '')
            setCountryIso2(p.countryIso2 || 'AE')
            setDescription(p.description || '')
            setCompletionYear(p.completionYear ? String(p.completionYear) : '')
            setStartingPrice(p.startingPrice ? String(p.startingPrice) : '')
            setGoldenVisa(p.goldenVisa || false)
            setCoverImage(p.coverImage || '')
            setStatus(p.status || 'DRAFT')
            setLeadCount(p._count?.leads || 0)
            setMedia(p.media || [])
            setUnitTypes(
                (p.unitTypes || []).map((ut: any) => ({
                    unitType: ut.unitType || '',
                    sizeFrom: ut.sizeFrom ? String(ut.sizeFrom) : '',
                    sizeTo: ut.sizeTo ? String(ut.sizeTo) : '',
                    priceFrom: ut.priceFrom ? String(ut.priceFrom) : '',
                }))
            )
        } catch (err: any) {
            setError(err.message || 'Failed to load project')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => { loadProject() }, [loadProject])

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            const payload: any = {
                name: name.trim(),
                slug: slug.trim(),
                developerId,
                countryIso2: countryIso2 || null,
                city: city.trim() || null,
                community: community.trim() || null,
                description: description.trim() || null,
                completionYear: completionYear ? parseInt(completionYear, 10) : null,
                startingPrice: startingPrice ? parseFloat(startingPrice) : null,
                goldenVisa,
                coverImage: coverImage || null,
                unitTypes: unitTypes.filter((ut) => ut.unitType.trim()).map((ut) => ({
                    unitType: ut.unitType.trim(),
                    sizeFrom: ut.sizeFrom ? parseInt(ut.sizeFrom, 10) : null,
                    sizeTo: ut.sizeTo ? parseInt(ut.sizeTo, 10) : null,
                    priceFrom: ut.priceFrom ? parseFloat(ut.priceFrom) : null,
                })),
            }

            const res = await fetch(`/api/admin/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to save')
            setSuccess('Project updated successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            setError(err.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/projects/${projectId}/publish`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setStatus(newStatus)
            setSuccess(`Status changed to ${newStatus}`)
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            setError(err.message || 'Failed to change status')
        }
    }

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setUploading(true)
        try {
            for (let i = 0; i < files.length; i++) {
                const fd = new FormData()
                fd.append('file', files[i])
                fd.append('mediaType', 'gallery')
                fd.append('sortOrder', String(media.length + i + 1))
                const res = await fetch(`/api/admin/projects/${projectId}/media`, { method: 'POST', body: fd })
                const json = await res.json()
                if (json.success && json.media) {
                    setMedia((prev) => [...prev, json.media])
                }
            }
        } catch (err: any) {
            setError(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleMediaDelete = async (mediaId: string) => {
        if (!confirm('Delete this media?')) return
        try {
            const res = await fetch(`/api/admin/projects/${projectId}/media/${mediaId}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setMedia((prev) => prev.filter((m) => m.id !== mediaId))
        } catch (err: any) {
            setError(err.message || 'Failed to delete')
        }
    }

    const addUnitType = () => setUnitTypes((prev) => [...prev, { unitType: '', sizeFrom: '', sizeTo: '', priceFrom: '' }])
    const updateUnitType = (idx: number, field: keyof UnitTypeRow, value: string) =>
        setUnitTypes((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
    const removeUnitType = (idx: number) => setUnitTypes((prev) => prev.filter((_, i) => i !== idx))

    if (loading) {
        return (
            <div className="flex items-center gap-3 py-20 justify-center text-white/40">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading project…
            </div>
        )
    }

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">{name || 'Edit Project'}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] || ''}`}>
                            {status}
                        </span>
                        <span className="text-xs text-white/30">{leadCount} leads</span>
                        <span className="text-xs text-white/30">{media.length} media</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {status !== 'PUBLISHED' && (
                        <button onClick={() => handleStatusChange('PUBLISHED')}
                            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all">
                            Publish
                        </button>
                    )}
                    {status === 'PUBLISHED' && (
                        <button onClick={() => handleStatusChange('DRAFT')}
                            className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/20 transition-all">
                            Unpublish
                        </button>
                    )}
                    {status !== 'ARCHIVED' && (
                        <button onClick={() => handleStatusChange('ARCHIVED')}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/40 hover:text-white/60 transition-all">
                            Archive
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
            {success && <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Basic Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Project Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Slug</label>
                            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Developer</label>
                            <select value={developerId} onChange={(e) => setDeveloperId(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all">
                                <option value="" className="bg-[#0a1019]">Select…</option>
                                {developers.map((d) => <option key={d.id} value={d.id} className="bg-[#0a1019]">{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">City</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Community</label>
                            <input type="text" value={community} onChange={(e) => setCommunity(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Completion Year</label>
                            <input type="number" value={completionYear} onChange={(e) => setCompletionYear(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Starting Price (AED)</label>
                            <input type="number" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all resize-none" />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3">
                            <button type="button" onClick={() => setGoldenVisa(!goldenVisa)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${goldenVisa ? 'bg-amber-400' : 'bg-white/[0.1]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${goldenVisa ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white/60">Golden Visa Eligible</span>
                        </div>
                    </div>
                </div>

                {/* Media Gallery */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Media Gallery ({media.length})</h2>
                        <label className={`inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading ? 'Uploading…' : (
                                <>
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Upload
                                </>
                            )}
                            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} disabled={uploading} />
                        </label>
                    </div>

                    {media.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {media.map((m) => (
                                <div key={m.id} className="group relative rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
                                    <img src={m.mediaUrl} alt="" className="w-full h-24 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => handleMediaDelete(m.id)}
                                            className="rounded-lg bg-red-500/80 p-2 text-white hover:bg-red-500 transition-colors">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="px-2 py-1.5">
                                        <p className="text-[10px] text-white/30 truncate">{m.mediaType}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-4 text-center">No media uploaded yet</p>
                    )}
                </div>

                {/* Unit Types */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Unit Types</h2>
                        <button type="button" onClick={addUnitType}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Row
                        </button>
                    </div>
                    {unitTypes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left">
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Type</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Size From</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Size To</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Price From</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unitTypes.map((ut, idx) => (
                                        <tr key={idx} className="group">
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={ut.unitType} onChange={(e) => updateUnitType(idx, 'unitType', e.target.value)}
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={ut.sizeFrom} onChange={(e) => updateUnitType(idx, 'sizeFrom', e.target.value)}
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={ut.sizeTo} onChange={(e) => updateUnitType(idx, 'sizeTo', e.target.value)}
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={ut.priceFrom} onChange={(e) => updateUnitType(idx, 'priceFrom', e.target.value)}
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pb-2">
                                                <button type="button" onClick={() => removeUnitType(idx)}
                                                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-all">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No unit types. Click &quot;Add Row&quot; to add one.</p>
                    )}
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleSave} disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => router.push('/admin/projects')}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                        Back to List
                    </button>
                </div>
            </div>
        </div>
    )
}
