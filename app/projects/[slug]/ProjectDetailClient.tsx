'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'

interface ProjectData {
    id: string
    name: string
    slug: string
    city: string | null
    community: string | null
    countryIso2: string | null
    description: string | null
    completionYear: number | null
    startingPrice: number | null
    goldenVisa: boolean
    coverImage: string | null
    status: string
    createdAt: string
    developer: { id: string; name: string; slug: string | null; logo: string | null } | null
    media: { id: string; mediaUrl: string; mediaType: string; sortOrder: number | null }[]
    unitTypes: { id: string; unitType: string; sizeFrom: number | null; sizeTo: number | null; priceFrom: number | null }[]
}

function formatPrice(price: number | null | undefined) {
    if (!price) return 'TBD'
    if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`
    if (price >= 1_000) return `AED ${(price / 1_000).toFixed(0)}K`
    return `AED ${price.toLocaleString()}`
}

export default function ProjectDetailClient({ project }: { project: ProjectData }) {
    const [selectedImg, setSelectedImg] = useState(0)
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [formError, setFormError] = useState('')

    const galleryImages = useMemo(() => {
        const images = project.media.filter((m) => m.mediaType === 'gallery' || m.mediaType === 'cover' || m.mediaType === 'image')
        if (images.length === 0 && project.coverImage) {
            return [{ id: 'cover', mediaUrl: project.coverImage, mediaType: 'cover', sortOrder: 0 }]
        }
        return images
    }, [project.media, project.coverImage])

    const heroImage = project.coverImage || galleryImages[0]?.mediaUrl || null

    const handleSubmitLead = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
            setFormError('Please fill in all required fields')
            return
        }
        setSubmitting(true)
        setFormError('')
        try {
            const res = await fetch(`/api/projects/${project.slug}/lead`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to submit')
            setSubmitted(true)
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit inquiry')
        } finally {
            setSubmitting(false)
        }
    }, [formData, project.slug])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden bg-gray-900">
                {heroImage ? (
                    <img
                        src={heroImage}
                        alt={project.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="eager"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
                    <div className="container mx-auto max-w-7xl">
                        {project.goldenVisa && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-black mb-3 shadow-lg">
                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Golden Visa Eligible
                            </span>
                        )}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                            {project.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-white/80 text-sm">
                            {project.developer && (
                                <span className="flex items-center gap-2">
                                    {project.developer.logo && (
                                        <img src={project.developer.logo} alt="" className="h-5 w-5 rounded object-cover" />
                                    )}
                                    by <span className="font-semibold text-white">{project.developer.name}</span>
                                </span>
                            )}
                            {project.city && (
                                <>
                                    <span className="text-white/30">•</span>
                                    <span>{project.city}{project.community ? `, ${project.community}` : ''}</span>
                                </>
                            )}
                            {project.startingPrice && (
                                <>
                                    <span className="text-white/30">•</span>
                                    <span className="font-semibold text-amber-300">From {formatPrice(project.startingPrice)}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Gallery */}
                        {galleryImages.length > 1 && (
                            <section>
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Gallery</h2>
                                <div className="space-y-3">
                                    <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                                        <img
                                            src={galleryImages[selectedImg]?.mediaUrl || ''}
                                            alt={`${project.name} gallery`}
                                            className="w-full h-full object-cover transition-opacity duration-300"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                        {galleryImages.map((img, idx) => (
                                            <button
                                                key={img.id}
                                                onClick={() => setSelectedImg(idx)}
                                                className={`flex-shrink-0 rounded-xl overflow-hidden h-16 w-24 border-2 transition-all ${idx === selectedImg
                                                    ? 'border-amber-500 shadow-md shadow-amber-500/20'
                                                    : 'border-transparent opacity-60 hover:opacity-100'
                                                    }`}
                                            >
                                                <img src={img.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Overview */}
                        {project.description && (
                            <section>
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Project Overview</h2>
                                <div className="prose prose-gray max-w-none">
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{project.description}</p>
                                </div>
                            </section>
                        )}

                        {/* Key Details */}
                        <section>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Key Details</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {project.developer && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Developer</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.developer.name}</p>
                                    </div>
                                )}
                                {project.city && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.city}{project.community ? `, ${project.community}` : ''}</p>
                                    </div>
                                )}
                                {project.completionYear && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Completion</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.completionYear}</p>
                                    </div>
                                )}
                                {project.startingPrice && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Starting From</p>
                                        <p className="text-sm font-semibold text-amber-600">{formatPrice(project.startingPrice)}</p>
                                    </div>
                                )}
                                {project.goldenVisa && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Golden Visa</p>
                                        <p className="text-sm font-semibold text-amber-800">Eligible ✓</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Unit Types */}
                        {project.unitTypes.length > 0 && (
                            <section>
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Available Unit Types</h2>
                                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Unit Type</th>
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Size (sqft)</th>
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Starting Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {project.unitTypes.map((ut) => (
                                                <tr key={ut.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3.5 font-semibold text-gray-900">{ut.unitType}</td>
                                                    <td className="px-5 py-3.5 text-gray-600">
                                                        {ut.sizeFrom && ut.sizeTo
                                                            ? `${ut.sizeFrom.toLocaleString()} – ${ut.sizeTo.toLocaleString()}`
                                                            : ut.sizeFrom
                                                                ? `From ${ut.sizeFrom.toLocaleString()}`
                                                                : ut.sizeTo
                                                                    ? `Up to ${ut.sizeTo.toLocaleString()}`
                                                                    : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-semibold text-amber-600">
                                                        {ut.priceFrom ? formatPrice(ut.priceFrom) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar — Inquiry Form */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Interested in {project.name}?</h3>
                                <p className="text-sm text-gray-500 mb-6">Fill in your details and our team will get back to you</p>

                                {submitted ? (
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                                        <svg className="mx-auto h-10 w-10 text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="font-semibold text-emerald-800 mb-1">Inquiry Submitted!</p>
                                        <p className="text-sm text-emerald-600">We&apos;ll get in touch with you shortly.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitLead} className="space-y-4">
                                        {formError && (
                                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{formError}</div>
                                        )}
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Your Name *"
                                                value={formData.name}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="email"
                                                placeholder="Email Address *"
                                                value={formData.email}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="tel"
                                                placeholder="Phone Number *"
                                                value={formData.phone}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <textarea
                                                placeholder="Message (optional)"
                                                rows={3}
                                                value={formData.message}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                                                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all resize-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                        >
                                            {submitting ? 'Sending…' : 'Send Inquiry'}
                                        </button>
                                        <p className="text-[11px] text-gray-400 text-center">
                                            By submitting, you agree to our terms and privacy policy.
                                        </p>
                                    </form>
                                )}
                            </div>

                            {/* Developer Card */}
                            {project.developer && (
                                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
                                    <div className="flex items-center gap-3">
                                        {project.developer.logo ? (
                                            <img src={project.developer.logo} alt={project.developer.name} className="h-10 w-10 rounded-xl object-cover border border-gray-100" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">
                                                {project.developer.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{project.developer.name}</p>
                                            <p className="text-xs text-gray-400">Developer</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
