'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

export default function AdminAddDeveloperPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [countryIso2, setCountryIso2] = useState('AE')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [autoSlug, setAutoSlug] = useState(true)

    const handleNameChange = (val: string) => {
        setName(val)
        if (autoSlug) setSlug(slugify(val))
    }

    const handleSlugChange = (val: string) => {
        setAutoSlug(false)
        setSlug(val)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) { setError('Name is required'); return }
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/admin/developers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), slug: slug.trim() || undefined, countryIso2 }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to create')
            router.push('/admin/developers')
        } catch (err: any) {
            setError(err.message || 'Failed to create developer')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-white/95">Add Developer</h1>
                <p className="mt-1 text-sm text-white/40">Create a new developer company profile</p>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                            Developer Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. DAMAC Properties"
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all"
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                            Slug
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            placeholder="auto-generated from name"
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all font-mono"
                        />
                        <p className="mt-1.5 text-[11px] text-white/25">Used in URLs: /developers/{slug || '...'}</p>
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                            Country
                        </label>
                        <SelectDropdown
                            label="Country"
                            showLabel={false}
                            variant="dark"
                            value={countryIso2}
                            onChange={setCountryIso2}
                            options={[
                                { value: 'AE', label: 'UAE' },
                                { value: 'IN', label: 'India' },
                            ]}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving…
                            </>
                        ) : 'Create Developer'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/developers')}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
