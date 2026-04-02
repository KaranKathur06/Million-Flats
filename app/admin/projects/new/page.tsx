'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'

interface DevOption {
    id: string
    name: string
    slug: string | null
}

interface UnitTypeRow {
    unitType: string
    sizeFrom: string
    sizeTo: string
    priceFrom: string
}

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120)
}

export default function AdminAddProjectPage() {
    const router = useRouter()
    const [developers, setDevelopers] = useState<DevOption[]>([])

    // Form state
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [autoSlug, setAutoSlug] = useState(true)
    const [developerId, setDeveloperId] = useState('')
    const [city, setCity] = useState('')
    const [community, setCommunity] = useState('')
    const [countryIso2, setCountryIso2] = useState('AE')
    const [description, setDescription] = useState('')
    const [completionYear, setCompletionYear] = useState('')
    const [startingPrice, setStartingPrice] = useState('')
    const [goldenVisa, setGoldenVisa] = useState(false)
    const [isFeatured, setIsFeatured] = useState(false)
    const [featuredOrder, setFeaturedOrder] = useState('')

    // Unit types
    const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([])

    // Media uploads
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [galleryFiles, setGalleryFiles] = useState<File[]>([])

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Load developers for dropdown
    const loadDevs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/developers')
            const json = await res.json()
            if (json.success) setDevelopers(json.items || [])
        } catch { }
    }, [])

    useEffect(() => { loadDevs() }, [loadDevs])

    const handleNameChange = (val: string) => {
        setName(val)
        if (autoSlug) setSlug(slugify(val))
    }

    const addUnitType = () => {
        setUnitTypes((prev) => [...prev, { unitType: '', sizeFrom: '', sizeTo: '', priceFrom: '' }])
    }

    const updateUnitType = (idx: number, field: keyof UnitTypeRow, value: string) => {
        setUnitTypes((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
    }

    const removeUnitType = (idx: number) => {
        setUnitTypes((prev) => prev.filter((_, i) => i !== idx))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) { setError('Project name is required'); return }
        if (!developerId) { setError('Select a developer'); return }

        setSaving(true)
        setError('')

        try {
            // 1. Create the project
            const projectPayload: any = {
                name: name.trim(),
                slug: slug.trim() || undefined,
                developerId,
                countryIso2: countryIso2 || undefined,
                city: city.trim() || undefined,
                community: community.trim() || undefined,
                description: description.trim() || undefined,
                completionYear: completionYear ? parseInt(completionYear, 10) : undefined,
                startingPrice: startingPrice ? startingPrice.trim() : undefined,
                goldenVisa,
                isFeatured,
                featuredOrder: isFeatured && featuredOrder ? parseInt(featuredOrder, 10) : null,
                unitTypes: unitTypes
                    .filter((ut) => ut.unitType.trim())
                    .map((ut) => ({
                        unitType: ut.unitType.trim(),
                        bedrooms: (() => {
                            const m = ut.unitType.match(/(\d+)/)
                            return m ? parseInt(m[1], 10) : null
                        })(),
                        sizeFrom: ut.sizeFrom ? parseInt(ut.sizeFrom, 10) : undefined,
                        sizeTo: ut.sizeTo ? parseInt(ut.sizeTo, 10) : undefined,
                        priceFrom: ut.priceFrom ? ut.priceFrom.trim() : undefined,
                        variants: [
                            {
                                title: 'Type A',
                                size: ut.sizeFrom ? parseInt(ut.sizeFrom, 10) : undefined,
                                price: ut.priceFrom ? ut.priceFrom.trim() : undefined,
                                availabilityStatus: 'AVAILABLE',
                            },
                        ],
                    })),
            }

            const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectPayload),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to create project')

            const projectId = json.project.id

            // 2. Upload cover image
            if (coverFile) {
                const fd = new FormData()
                fd.append('file', coverFile)
                fd.append('mediaType', 'hero')
                fd.append('sortOrder', '0')
                const upRes = await fetch(`/api/admin/projects/${projectId}/media`, { method: 'POST', body: fd })
                const upJson = await upRes.json()
                if (upJson.success && upJson.media?.mediaUrl) {
                    // Update project coverImage
                    await fetch(`/api/admin/projects/${projectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ coverImage: upJson.media.mediaUrl }),
                    })
                }
            }

            // 3. Upload gallery images
            for (let i = 0; i < galleryFiles.length; i++) {
                const fd = new FormData()
                fd.append('file', galleryFiles[i])
                fd.append('mediaType', 'gallery')
                fd.append('sortOrder', String(i + 1))
                await fetch(`/api/admin/projects/${projectId}/media`, { method: 'POST', body: fd })
            }

            router.push('/admin/projects')
        } catch (err: any) {
            setError(err.message || 'Failed to create project')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-white/95">Add Project</h1>
                <p className="mt-1 text-sm text-white/40">Create a new developer project (saved as Draft)</p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Basic Information</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                                Project Name <span className="text-red-400">*</span>
                            </label>
                            <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Safa Gate"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Slug</label>
                            <input type="text" value={slug} onChange={(e) => { setAutoSlug(false); setSlug(e.target.value) }} placeholder="auto-generated"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all font-mono" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                                Developer <span className="text-red-400">*</span>
                            </label>
                            <SelectDropdown
                                label="Developer"
                                value={developerId}
                                onChange={setDeveloperId}
                                options={[
                                    { value: '', label: 'Select developer…' },
                                    ...developers.map((d) => ({ value: d.id, label: d.name }))
                                ]}
                                showLabel={false}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">City</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dubai"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Community</label>
                            <input type="text" value={community} onChange={(e) => setCommunity(e.target.value)} placeholder="e.g. Business Bay"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Country</label>
                            <SelectDropdown
                                label="Country"
                                value={countryIso2}
                                onChange={setCountryIso2}
                                options={[
                                    { value: 'AE', label: 'UAE' },
                                    { value: 'IN', label: 'India' }
                                ]}
                                showLabel={false}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Completion Year</label>
                            <input type="number" value={completionYear} onChange={(e) => setCompletionYear(e.target.value)} placeholder="e.g. 2027"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Starting Price (AED)</label>
                            <input type="text" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="e.g. 2.16M or 750K"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Project description…"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all resize-none" />
                        </div>

                        <div className="sm:col-span-2 flex items-center gap-3">
                            <button type="button" onClick={() => setGoldenVisa(!goldenVisa)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${goldenVisa ? 'bg-amber-400' : 'bg-white/[0.1]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${goldenVisa ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white/60">Golden Visa Eligible</span>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3">
                            <button type="button" onClick={() => setIsFeatured(!isFeatured)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? 'bg-amber-400' : 'bg-white/[0.1]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white/60">Featured Project</span>
                        </div>
                        {isFeatured && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Featured Order</label>
                                <input type="number" min={0} value={featuredOrder} onChange={(e) => setFeaturedOrder(e.target.value)} placeholder="0"
                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Media */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Media</h2>

                    {/* Cover Image */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Cover Image</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-4 text-center hover:border-amber-400/30 hover:bg-white/[0.04] transition-all">
                                <svg className="mx-auto h-6 w-6 text-white/25 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-white/40">{coverFile ? coverFile.name : 'Upload cover image'}</span>
                                <input type="file" accept="image/*" className="hidden"
                                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                            </label>
                            {coverFile && (
                                <button type="button" onClick={() => setCoverFile(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                            )}
                        </div>
                    </div>

                    {/* Gallery */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                            Gallery Images ({galleryFiles.length} selected)
                        </label>
                        <label className="cursor-pointer rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-4 text-center hover:border-amber-400/30 hover:bg-white/[0.04] transition-all block">
                            <svg className="mx-auto h-6 w-6 text-white/25 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-xs text-white/40">Click to add gallery images</span>
                            <input type="file" accept="image/*" multiple className="hidden"
                                onChange={(e) => { if (e.target.files) setGalleryFiles(Array.from(e.target.files)) }} />
                        </label>
                        {galleryFiles.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {galleryFiles.map((f, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white/50">
                                        {f.name.slice(0, 20)}{f.name.length > 20 ? '…' : ''}
                                        <button type="button" onClick={() => setGalleryFiles((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
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

                    {unitTypes.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left">
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Unit Type</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Size From (sqft)</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Size To (sqft)</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Price From (AED)</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unitTypes.map((ut, idx) => (
                                        <tr key={idx} className="group">
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={ut.unitType} onChange={(e) => updateUnitType(idx, 'unitType', e.target.value)} placeholder="e.g. 1BR"
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={ut.sizeFrom} onChange={(e) => updateUnitType(idx, 'sizeFrom', e.target.value)} placeholder="800"
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={ut.sizeTo} onChange={(e) => updateUnitType(idx, 'sizeTo', e.target.value)} placeholder="1200"
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={ut.priceFrom} onChange={(e) => updateUnitType(idx, 'priceFrom', e.target.value)} placeholder="e.g. 750K"
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
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
                    )}

                    {unitTypes.length === 0 && (
                        <p className="text-xs text-white/25 py-2">No unit types added yet. Click &quot;Add Row&quot; to add one.</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50">
                        {saving ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving…
                            </>
                        ) : 'Create Project'}
                    </button>
                    <button type="button" onClick={() => router.push('/admin/projects')}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
