'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════ */
interface ProjectData {
    id: string
    name: string
    slug: string
    city: string | null
    community: string | null
    countryIso2: string | null
    description: string | null
    highlights: string[]
    completionYear: number | null
    startingPrice: number | null
    goldenVisa: boolean
    coverImage: string | null
    status: string
    createdAt: string
    developer: { id: string; name: string; slug: string | null; logo: string | null } | null
    media: { id: string; mediaUrl: string; mediaType: string; sortOrder: number | null }[]
    mediaStructured?: {
        hero?: string
        featured?: string[]
        tabs?: {
            exterior?: string[]
            amenities?: string[]
            interiors?: string[]
            lifestyle?: string[]
        }
    } | null
    brochure?: { title: string; file: string } | null
    unitTypes: { id: string; unitType: string; sizeFrom: number | null; sizeTo: number | null; priceFrom: number | null }[]
    amenities: { id: string; name: string; icon: string | null; category: string | null }[]
    paymentPlans: { id: string; stage: string; percentage: number; milestone: string | null; sortOrder: number | null }[]
    floorPlans: { id: string; unitType: string; bedrooms: number | null; size: string | null; price: string | null; imageUrl: string | null }[]
    videos: { id: string; videoUrl: string; title: string | null; thumbnail: string | null; sortOrder: number | null }[]
    location: { id: string; latitude: number | null; longitude: number | null; address: string | null; mapUrl: string | null } | null
    nearbyPlaces: { id: string; name: string; category: string | null; distance: string | null; sortOrder: number | null }[]
    similarProjects: { id: string; name: string; slug: string; city: string | null; community: string | null; startingPrice: number | null; goldenVisa: boolean; coverImage: string | null; developer: { name: string } | null }[]
}

function uniqueStrings(list: (string | undefined | null)[]) {
    const set = new Set<string>()
    for (const item of list) {
        const v = typeof item === 'string' ? item.trim() : ''
        if (v) set.add(v)
    }
    return Array.from(set)
}

function resolvePublicMediaUrl(input: string) {
    const v = String(input || '').trim()
    if (!v) return ''

    // Already a full URL or absolute path
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v

    // S3 key - convert to full S3 URL
    if (v.startsWith('public/') || v.startsWith('private/')) {
        const base = String(process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
        if (base) {
            return `${base}/${encodeURIComponent(v).replace(/%2F/g, '/')}`
        }
        // Fallback: build S3 URL directly from bucket/region
        try {
            const { buildS3ObjectUrl } = require('@/lib/s3')
            return buildS3ObjectUrl({ key: v })
        } catch {
            // Last resort - return as-is (will likely fail, but visible for debugging)
            return v
        }
    }

    return v
}

/** Extract a human-readable image name from its URL or S3 key */
function extractImageName(input: string): string {
    const v = String(input || '').trim()
    if (!v) return ''
    // Decode URI components first
    let decoded = v
    try { decoded = decodeURIComponent(v) } catch { /* ignore */ }
    // Get the filename from the path
    const parts = decoded.split('/')
    let filename = parts[parts.length - 1] || ''
    // Remove file extension
    filename = filename.replace(/\.[^.]+$/, '')
    // Clean up: replace dashes/underscores with spaces, trim
    filename = filename.replace(/[-_]+/g, ' ').trim()
    // Title case
    return filename
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function formatPrice(price: number | null | undefined) {
    if (!price) return 'TBD'
    if (price >= 1_000_000_000) return `AED ${(price / 1_000_000_000).toFixed(1)}B`
    if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`
    if (price >= 1_000) return `AED ${(price / 1_000).toFixed(0)}K`
    return `AED ${price.toLocaleString()}`
}

/* Amenity Icon Component */
function AmenityIcon({ icon }: { icon: string | null }) {
    const iconMap: Record<string, string> = {
        pool: '🏊', gym: '💪', restaurant: '🍽️', bike: '🚴', run: '🏃',
        park: '🌳', garden: '🌿', security: '🔒', parking: '🅿️',
        shopping: '🛒', health: '🏥', spa: '🧖', club: '🏘️',
        community: '🏛️', yoga: '🧘', tennis: '🎾', basketball: '🏀',
        kids: '👶', entertainment: '🎭', power: '⚡', water: '💧',
        nature: '🌱', events: '🎪', sports: '⚽',
    }
    return <span className="text-lg">{iconMap[icon || ''] || '✨'}</span>
}

/* ─── Section Header ─── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-1 h-6 bg-amber-500 rounded-full" />
                {title}
            </h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1 ml-4">{subtitle}</p>}
        </div>
    )
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function ProjectDetailClient({ project }: { project: ProjectData }) {
    const [selectedImg, setSelectedImg] = useState(0)
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [formError, setFormError] = useState('')
    const [showAllAmenities, setShowAllAmenities] = useState(false)
    const [activeTab, setActiveTab] = useState<'overview' | 'amenities' | 'plans' | 'gallery' | 'location'>('overview')

    const [galleryCategory, setGalleryCategory] = useState<'all' | 'exterior' | 'amenities' | 'interiors' | 'lifestyle'>('all')
    const [galleryVisibleCount, setGalleryVisibleCount] = useState(100)
    const [galleryModalOpen, setGalleryModalOpen] = useState(false)
    const [modalImgIndex, setModalImgIndex] = useState(0)
    const [modalSource, setModalSource] = useState<'featured' | 'tab'>('tab')

    // Recognised gallery media types (tab-specific + legacy ones)
    const GALLERY_MEDIA_TYPES = useMemo(() => new Set(['gallery', 'cover', 'image', 'IMAGE', 'featured', 'exterior', 'amenities', 'interiors', 'lifestyle']), [])

    const allGalleryMedia = useMemo(() => {
        const images = project.media.filter((m) => GALLERY_MEDIA_TYPES.has(m.mediaType))
        if (images.length === 0 && project.coverImage) {
            return [{ id: 'cover', mediaUrl: project.coverImage, mediaType: 'cover', sortOrder: 0 }]
        }
        return images
    }, [project.media, project.coverImage, GALLERY_MEDIA_TYPES])

    const brochureLink = useMemo(() => {
        if (project.brochure?.file) return project.brochure.file
        const mediaBrochure = project.media.find((m) => String(m.mediaType || '').toLowerCase() === 'brochure')
        return mediaBrochure?.mediaUrl || null
    }, [project.brochure?.file, project.media])

    const structuredMedia = project.mediaStructured || null

    const heroImage = structuredMedia?.hero || project.coverImage || allGalleryMedia[0]?.mediaUrl || null
    const heroImageResolved = heroImage ? resolvePublicMediaUrl(heroImage) : null

    // Featured images: from structuredMedia, from 'featured' mediaType records, or first 5 gallery images
    const featuredImages = useMemo(() => {
        if (structuredMedia?.featured && structuredMedia.featured.length > 0) return structuredMedia.featured
        const featuredRecords = allGalleryMedia.filter(m => m.mediaType === 'featured')
        if (featuredRecords.length > 0) return featuredRecords.map(m => m.mediaUrl)
        if (allGalleryMedia.length > 0) return allGalleryMedia.slice(0, 5).map((m) => m.mediaUrl)
        return []
    }, [structuredMedia, allGalleryMedia])

    const featuredImagesResolved = useMemo(() => featuredImages.map(resolvePublicMediaUrl).filter(Boolean), [featuredImages])

    // Tab images: from structuredMedia tabs, from mediaType-based records, or fallback to all
    const tabImages = useMemo(() => {
        // Approach 1: structuredMedia has explicit tabs
        const tabs = structuredMedia?.tabs
        if (tabs && (tabs.exterior?.length || tabs.amenities?.length || tabs.interiors?.length || tabs.lifestyle?.length)) {
            const hero = structuredMedia?.hero
            const filterHero = (list: string[]) => list.filter((img) => img !== hero)
            return {
                exterior: uniqueStrings(filterHero(tabs.exterior || [])),
                amenities: uniqueStrings(filterHero(tabs.amenities || [])),
                interiors: uniqueStrings(filterHero(tabs.interiors || [])),
                lifestyle: uniqueStrings(filterHero(tabs.lifestyle || [])),
            }
        }

        // Approach 2: DB records have tab-specific mediaTypes
        const byType = (type: string) => allGalleryMedia.filter(m => m.mediaType === type).map(m => m.mediaUrl)
        const ext = byType('exterior')
        const amen = byType('amenities')
        const inter = byType('interiors')
        const life = byType('lifestyle')
        if (ext.length > 0 || amen.length > 0 || inter.length > 0 || life.length > 0) {
            return {
                exterior: uniqueStrings(ext),
                amenities: uniqueStrings(amen),
                interiors: uniqueStrings(inter),
                lifestyle: uniqueStrings(life),
            }
        }

        // Fallback: show all in every tab
        const all = allGalleryMedia.map((m) => m.mediaUrl).filter((url) => url !== structuredMedia?.hero)
        return { exterior: all, amenities: all, interiors: all, lifestyle: all }
    }, [structuredMedia, allGalleryMedia])

    const tabImagesResolved = useMemo(() => {
        return {
            exterior: tabImages.exterior.map(resolvePublicMediaUrl).filter(Boolean),
            amenities: tabImages.amenities.map(resolvePublicMediaUrl).filter(Boolean),
            interiors: tabImages.interiors.map(resolvePublicMediaUrl).filter(Boolean),
            lifestyle: tabImages.lifestyle.map(resolvePublicMediaUrl).filter(Boolean),
        }
    }, [tabImages])

    // "All" tab: combine all unique images across all tabs
    const allTabImages = useMemo(() => uniqueStrings([
        ...tabImages.exterior, ...tabImages.amenities, ...tabImages.interiors, ...tabImages.lifestyle,
    ]), [tabImages])
    const allTabImagesResolved = useMemo(() => allTabImages.map(resolvePublicMediaUrl).filter(Boolean), [allTabImages])

    const activeGalleryImages = galleryCategory === 'all' ? allTabImagesResolved : (tabImagesResolved[galleryCategory] || [])

    // Raw (unresolved) images for name extraction
    const activeGalleryRawImages = galleryCategory === 'all' ? allTabImages : (tabImages[galleryCategory] || [])

    const visibleGalleryImages = useMemo(() => {
        return activeGalleryImages.slice(0, galleryVisibleCount)
    }, [activeGalleryImages, galleryVisibleCount])

    // Modal images: depends on whether opened from featured section or tab grid
    const modalImages = useMemo(() => {
        if (modalSource === 'featured') return featuredImagesResolved
        return activeGalleryImages
    }, [modalSource, featuredImagesResolved, activeGalleryImages])

    // Raw images for modal name extraction
    const modalRawImages = useMemo(() => {
        if (modalSource === 'featured') return featuredImages
        return activeGalleryRawImages
    }, [modalSource, featuredImages, activeGalleryRawImages])

    // Zoom state for premium viewer
    const [zoomLevel, setZoomLevel] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const amenityCategories = useMemo(() => {
        const cats: Record<string, typeof project.amenities> = {}
        project.amenities.forEach((a) => {
            const cat = a.category || 'general'
            if (!cats[cat]) cats[cat] = []
            cats[cat].push(a)
        })
        return cats
    }, [project.amenities])

    const displayedAmenities = showAllAmenities ? project.amenities : project.amenities.slice(0, 12)

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
            {/* ═══ HERO SECTION ═══ */}
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden bg-gray-900">
                {heroImageResolved ? (
                    <img src={heroImageResolved} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Breadcrumb */}
                <div className="absolute top-6 left-0 right-0 z-10">
                    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <nav className="flex items-center gap-2 text-sm text-white/60">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <span>›</span>
                            <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
                            <span>›</span>
                            <span className="text-white/90">{project.name}</span>
                        </nav>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
                    <div className="container mx-auto max-w-7xl">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {project.goldenVisa && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-black shadow-lg">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    Golden Visa Eligible
                                </span>
                            )}
                            {project.developer && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-white/20">
                                    by {project.developer.name}
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                            {project.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            {project.city && (
                                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {project.city}{project.community ? `, ${project.community}` : ''}
                                </span>
                            )}
                            {project.startingPrice && (
                                <span className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    From {formatPrice(project.startingPrice)}
                                </span>
                            )}
                            {project.completionYear && (
                                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Completion: {project.completionYear}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ TAB NAVIGATION ═══ */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
                        {(['overview', 'amenities', 'plans', 'gallery', 'location'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab)
                                    document.getElementById(`section-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${activeTab === tab
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab === 'plans' ? 'Floor Plans' : tab}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* ═══ CONTENT ═══ */}
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
                    {/* ─── MAIN COLUMN ─── */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* OVERVIEW SECTION */}
                        <section id="section-overview">
                            {project.description && (
                                <>
                                    <SectionHeader title="Project Overview" />
                                    <div className="prose prose-gray max-w-none">
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{project.description}</p>
                                    </div>
                                </>
                            )}
                        </section>

                        {/* HIGHLIGHTS */}
                        {project.highlights && project.highlights.length > 0 && (
                            <section>
                                <SectionHeader title="Key Highlights" />
                                <div className="space-y-3">
                                    {project.highlights.map((h, idx) => (
                                        <div key={idx} className="flex gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{h}</p>
                                        </div>
                                    ))}
                                </div>

                                {brochureLink && (
                                    <div className="mt-6">
                                        <a
                                            href={brochureLink}
                                            download
                                            rel="noopener"
                                            className="inline-flex items-center justify-center gap-3 h-12 px-6 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors w-full sm:w-auto"
                                        >
                                            <span className="text-lg">📄</span>
                                            Download Brochure
                                        </a>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* KEY DETAILS GRID */}
                        <section>
                            <SectionHeader title="Key Details" />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {project.developer && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Developer</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.developer.name}</p>
                                    </div>
                                )}
                                {project.city && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Location</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.city}{project.community ? `, ${project.community}` : ''}</p>
                                    </div>
                                )}
                                {project.completionYear && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Completion</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.completionYear}</p>
                                    </div>
                                )}
                                {project.startingPrice && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Starting From</p>
                                        <p className="text-sm font-semibold text-amber-600">{formatPrice(project.startingPrice)}</p>
                                    </div>
                                )}
                                {project.goldenVisa && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Golden Visa</p>
                                        <p className="text-sm font-semibold text-amber-800">Eligible ✓</p>
                                    </div>
                                )}
                                {project.unitTypes.length > 0 && (
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Unit Types</p>
                                        <p className="text-sm font-semibold text-gray-900">{project.unitTypes.length} Available</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* AMENITIES GRID */}
                        {project.amenities.length > 0 && (
                            <section id="section-amenities">
                                <SectionHeader title="Amenities & Facilities" subtitle={`${project.amenities.length} amenities available`} />
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {displayedAmenities.map((a) => (
                                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all">
                                            <AmenityIcon icon={a.icon} />
                                            <span className="text-sm text-gray-700 font-medium">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                                {project.amenities.length > 12 && (
                                    <button
                                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                                        className="mt-4 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                                    >
                                        {showAllAmenities ? 'Show Less' : `Show All ${project.amenities.length} Amenities →`}
                                    </button>
                                )}
                            </section>
                        )}

                        {/* PAYMENT PLAN */}
                        {project.paymentPlans.length > 0 && (
                            <section>
                                <SectionHeader title="Payment Plan" />
                                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                                    <div className="flex items-stretch">
                                        {project.paymentPlans.map((pp, idx) => (
                                            <div key={pp.id} className={`flex-1 p-5 text-center ${idx > 0 ? 'border-l border-gray-200' : ''}`}>
                                                <div className="text-3xl font-bold text-amber-600 mb-1">{pp.percentage}%</div>
                                                <div className="text-sm font-semibold text-gray-900 mb-0.5">{pp.stage}</div>
                                                {pp.milestone && <div className="text-xs text-gray-400">{pp.milestone}</div>}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Progress bar showing proportions */}
                                    <div className="flex h-2">
                                        {project.paymentPlans.map((pp, idx) => {
                                            const colors = ['bg-amber-500', 'bg-amber-400', 'bg-amber-300', 'bg-amber-200']
                                            return (
                                                <div
                                                    key={pp.id}
                                                    className={`${colors[idx % colors.length]} transition-all`}
                                                    style={{ width: `${pp.percentage}%` }}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* FLOOR PLANS */}
                        {project.floorPlans.length > 0 && (
                            <section id="section-plans">
                                <SectionHeader title="Floor Plans" subtitle="Available unit configurations" />
                                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Unit Type</th>
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Bedrooms</th>
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Size</th>
                                                <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {project.floorPlans.map((fp) => (
                                                <tr key={fp.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3.5 font-semibold text-gray-900">{fp.unitType}</td>
                                                    <td className="px-5 py-3.5 text-gray-600">{fp.bedrooms ? `${fp.bedrooms} BR` : '—'}</td>
                                                    <td className="px-5 py-3.5 text-gray-600">{fp.size || '—'}</td>
                                                    <td className="px-5 py-3.5 font-semibold text-amber-600">{fp.price || 'On Request'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* UNIT TYPES TABLE */}
                        {project.unitTypes.length > 0 && project.floorPlans.length === 0 && (
                            <section>
                                <SectionHeader title="Available Unit Types" />
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
                                                                : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 font-semibold text-amber-600">{ut.priceFrom ? formatPrice(ut.priceFrom) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* GALLERY */}
                        {(featuredImagesResolved.length > 0 || activeGalleryImages.length > 0) && (
                            <section id="section-gallery">
                                <SectionHeader
                                    title="Gallery"
                                    subtitle={`${allTabImagesResolved.length} images`}
                                />

                                {/* Featured Gallery */}
                                {featuredImagesResolved.length > 0 && (
                                    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModalSource('featured')
                                                    setGalleryModalOpen(true)
                                                    setModalImgIndex(0)
                                                    setZoomLevel(1)
                                                }}
                                                className="relative md:col-span-2 md:row-span-2 aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer"
                                            >
                                                <img
                                                    src={featuredImagesResolved[0]}
                                                    alt={extractImageName(featuredImages[0]) || 'Featured'}
                                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                    <span className="text-white text-sm font-semibold drop-shadow-lg">{extractImageName(featuredImages[0]) || 'Featured'}</span>
                                                </div>
                                            </button>

                                            {featuredImagesResolved.slice(1, 5).map((src, idx) => (
                                                <button
                                                    key={`${src}-${idx}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setModalSource('featured')
                                                        setGalleryModalOpen(true)
                                                        setModalImgIndex(idx + 1)
                                                        setZoomLevel(1)
                                                    }}
                                                    className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer"
                                                >
                                                    <img
                                                        src={src}
                                                        alt={extractImageName(featuredImages[idx + 1]) || 'Featured'}
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                        <span className="text-white text-xs font-semibold drop-shadow-lg">{extractImageName(featuredImages[idx + 1]) || 'Featured'}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Gallery Tabs */}
                                <div className="mt-6">
                                    <div className="flex flex-wrap gap-2">
                                        {(['all', 'exterior', 'amenities', 'interiors', 'lifestyle'] as const).map((t) => {
                                            const count = t === 'all' ? allTabImagesResolved.length : (tabImagesResolved[t]?.length || 0)
                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => {
                                                        setGalleryCategory(t)
                                                        setGalleryVisibleCount(100)
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all capitalize cursor-pointer flex items-center gap-1.5 ${galleryCategory === t
                                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-200 hover:text-amber-700'
                                                        }`}
                                                >
                                                    {t}
                                                    {count > 0 && (
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${galleryCategory === t ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Tab Grid */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {visibleGalleryImages.map((src, idx) => {
                                            const imgName = extractImageName(activeGalleryRawImages[idx] || src)
                                            return (
                                                <button
                                                    key={`${src}-${idx}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setModalSource('tab')
                                                        setGalleryModalOpen(true)
                                                        setModalImgIndex(idx)
                                                        setZoomLevel(1)
                                                    }}
                                                    className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer"
                                                >
                                                    <img
                                                        src={src}
                                                        alt={imgName || `${project.name} ${galleryCategory}`}
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                    {/* Image name overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <span className="text-white text-xs font-semibold drop-shadow-lg leading-tight">{imgName}</span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {activeGalleryImages.length > galleryVisibleCount && (
                                        <div className="mt-6 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setGalleryVisibleCount(activeGalleryImages.length)}
                                                className="h-12 px-8 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors cursor-pointer"
                                            >
                                                Load All {activeGalleryImages.length} Images
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* ═══ PREMIUM IMAGE VIEWER MODAL ═══ */}
                                {galleryModalOpen && modalImages.length > 0 && (
                                    <div
                                        className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
                                        onClick={() => { setGalleryModalOpen(false); setZoomLevel(1); setIsFullscreen(false) }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') { setGalleryModalOpen(false); setZoomLevel(1); setIsFullscreen(false) }
                                            if (e.key === 'ArrowLeft') setModalImgIndex((p) => (p === 0 ? modalImages.length - 1 : p - 1))
                                            if (e.key === 'ArrowRight') setModalImgIndex((p) => (p === modalImages.length - 1 ? 0 : p + 1))
                                        }}
                                        tabIndex={0}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Image gallery viewer"
                                    >
                                        {/* Top Bar */}
                                        <div
                                            className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/40 backdrop-blur-sm z-10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Counter */}
                                            <div className="text-white/90 text-sm font-semibold tracking-wide">
                                                <span className="text-white font-bold">{modalImgIndex + 1}</span>
                                                <span className="text-white/50 mx-1">/</span>
                                                <span className="text-white/50">{modalImages.length}</span>
                                            </div>

                                            {/* Toolbar */}
                                            <div className="flex items-center gap-1">
                                                {/* Zoom Out */}
                                                <button
                                                    type="button"
                                                    onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                                                    className="h-9 w-9 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                                    aria-label="Zoom out"
                                                    title="Zoom out"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth={2}/><path strokeLinecap="round" strokeWidth={2} d="m21 21-4.35-4.35M8 11h6"/></svg>
                                                </button>
                                                {/* Zoom In */}
                                                <button
                                                    type="button"
                                                    onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                                                    className="h-9 w-9 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                                    aria-label="Zoom in"
                                                    title="Zoom in"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth={2}/><path strokeLinecap="round" strokeWidth={2} d="m21 21-4.35-4.35M8 11h6M11 8v6"/></svg>
                                                </button>
                                                {/* Fullscreen */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsFullscreen(f => !f)}
                                                    className="h-9 w-9 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                                    aria-label="Toggle fullscreen"
                                                    title="Toggle fullscreen"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
                                                </button>
                                                {/* Divider */}
                                                <div className="w-px h-5 bg-white/20 mx-1" />
                                                {/* Close */}
                                                <button
                                                    type="button"
                                                    onClick={() => { setGalleryModalOpen(false); setZoomLevel(1); setIsFullscreen(false) }}
                                                    className="h-9 w-9 rounded-lg bg-white/10 text-white/80 hover:bg-red-500/80 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                                    aria-label="Close gallery"
                                                    title="Close"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Main Image Area */}
                                        <div
                                            className="flex-1 flex items-center justify-center relative overflow-hidden"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Navigation Arrows */}
                                            {modalImages.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setModalImgIndex((p) => (p === 0 ? modalImages.length - 1 : p - 1)); setZoomLevel(1) }}
                                                        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-white/10"
                                                        aria-label="Previous image"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setModalImgIndex((p) => (p === modalImages.length - 1 ? 0 : p + 1)); setZoomLevel(1) }}
                                                        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer border border-white/10"
                                                        aria-label="Next image"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                                    </button>
                                                </>
                                            )}

                                            {/* Image */}
                                            <img
                                                src={modalImages[modalImgIndex]}
                                                alt={extractImageName(modalRawImages[modalImgIndex] || modalImages[modalImgIndex])}
                                                className="max-h-[calc(100vh-200px)] max-w-full object-contain transition-transform duration-300 select-none"
                                                style={{ transform: `scale(${zoomLevel})` }}
                                                loading="eager"
                                                draggable={false}
                                            />
                                        </div>

                                        {/* Bottom Area: Dots + Caption + Thumbnails */}
                                        <div
                                            className="bg-black/40 backdrop-blur-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Dot Indicators (only show if <= 20 images) */}
                                            {modalImages.length > 1 && modalImages.length <= 20 && (
                                                <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
                                                    {modalImages.map((_, dotIdx) => (
                                                        <button
                                                            key={dotIdx}
                                                            type="button"
                                                            onClick={() => { setModalImgIndex(dotIdx); setZoomLevel(1) }}
                                                            className={`rounded-full transition-all duration-200 cursor-pointer ${dotIdx === modalImgIndex
                                                                ? 'w-6 h-2 bg-amber-400'
                                                                : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                                                                }`}
                                                            aria-label={`Go to image ${dotIdx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Image Caption */}
                                            <div className="text-center py-2">
                                                <p className="text-white/90 text-sm font-semibold">
                                                    {extractImageName(modalRawImages[modalImgIndex] || modalImages[modalImgIndex])}
                                                </p>
                                            </div>

                                            {/* Thumbnail Strip */}
                                            {modalImages.length > 1 && (
                                                <div className="flex items-center justify-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-none">
                                                    {modalImages.map((thumbSrc, thumbIdx) => (
                                                        <button
                                                            key={`thumb-${thumbIdx}`}
                                                            type="button"
                                                            onClick={() => { setModalImgIndex(thumbIdx); setZoomLevel(1) }}
                                                            className={`flex-shrink-0 w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer border-2 ${
                                                                thumbIdx === modalImgIndex
                                                                    ? 'border-amber-400 opacity-100 ring-1 ring-amber-400/50'
                                                                    : 'border-transparent opacity-50 hover:opacity-80'
                                                            }`}
                                                            aria-label={`View image ${thumbIdx + 1}`}
                                                        >
                                                            <img
                                                                src={thumbSrc}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* VIDEOS */}
                        {project.videos.length > 0 && (
                            <section>
                                <SectionHeader title="Videos" subtitle={`${project.videos.length} project ${project.videos.length === 1 ? 'video' : 'videos'}`} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {project.videos.map((v) => (
                                        <div key={v.id} className="rounded-2xl overflow-hidden bg-gray-100 aspect-video">
                                            {v.videoUrl.includes('youtube') ? (
                                                <iframe
                                                    src={v.videoUrl.replace('watch?v=', 'embed/')}
                                                    title={v.title || 'Project Video'}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                                                    allowFullScreen
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <video src={v.videoUrl} controls className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* LOCATION */}
                        {(project.location?.address || project.nearbyPlaces.length > 0) && (
                            <section id="section-location">
                                <SectionHeader title="Location" subtitle={project.community ? `${project.community}, ${project.city}` : project.city || undefined} />
                                {project.location?.address && (
                                    <div className="prose prose-gray max-w-none mb-6">
                                        <p className="text-gray-600 leading-relaxed text-sm">{project.location.address}</p>
                                    </div>
                                )}
                                {/* Nearby Places */}
                                {project.nearbyPlaces.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-3">Nearby Landmarks</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {project.nearbyPlaces.map((np) => (
                                                <div key={np.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-amber-200 transition-colors">
                                                    <span className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                                        <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                        {np.name}
                                                    </span>
                                                    {np.distance && (
                                                        <span className="text-xs text-gray-400 font-medium">{np.distance}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* SIMILAR PROJECTS */}
                        {project.similarProjects && project.similarProjects.length > 0 && (
                            <section>
                                <SectionHeader title="Similar Projects" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {project.similarProjects.slice(0, 3).map((sp) => (
                                        <Link key={sp.id} href={`/projects/${sp.slug}`} className="group rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all">
                                            <div className="relative h-40 overflow-hidden bg-gray-100">
                                                {sp.coverImage ? (
                                                    <img src={sp.coverImage} alt={sp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                                                )}
                                                {sp.goldenVisa && (
                                                    <span className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">Golden Visa</span>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h4 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">{sp.name}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{sp.developer?.name} • {sp.city}{sp.community ? `, ${sp.community}` : ''}</p>
                                                {sp.startingPrice && (
                                                    <p className="text-sm font-bold text-amber-600 mt-2">From {formatPrice(sp.startingPrice)}</p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ─── SIDEBAR ─── */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-16 space-y-4">
                            {/* Inquiry Form */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Interested in {project.name}?</h3>
                                <p className="text-sm text-gray-500 mb-6">Fill in your details and our team will get back to you</p>

                                {submitted ? (
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                                        <svg className="mx-auto h-10 w-10 text-emerald-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="font-semibold text-emerald-800 mb-1">Inquiry Submitted!</p>
                                        <p className="text-sm text-emerald-600">We&apos;ll get in touch with you shortly.</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitLead} className="space-y-4">
                                        {formError && (
                                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{formError}</div>
                                        )}
                                        <input type="text" placeholder="Your Name *" value={formData.name}
                                            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all" />
                                        <input type="email" placeholder="Email Address *" value={formData.email}
                                            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all" />
                                        <input type="tel" placeholder="Phone Number *" value={formData.phone}
                                            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all" />
                                        <textarea placeholder="Message (optional)" rows={3} value={formData.message}
                                            onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all resize-none" />
                                        <button type="submit" disabled={submitting}
                                            className="w-full rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50">
                                            {submitting ? 'Sending…' : 'Send Inquiry'}
                                        </button>
                                        <p className="text-[11px] text-gray-400 text-center">By submitting, you agree to our terms and privacy policy.</p>
                                    </form>
                                )}
                            </div>

                            {/* Developer Card */}
                            {project.developer && (
                                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                                    <div className="flex items-center gap-3">
                                        {project.developer.logo ? (
                                            <img src={project.developer.logo} alt={project.developer.name} className="h-12 w-12 rounded-xl object-cover border border-gray-100" />
                                        ) : (
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-lg font-bold text-white">
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

                            {/* Quick Stats */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5">
                                <h4 className="text-sm font-bold text-gray-900 mb-3">Quick Summary</h4>
                                <div className="space-y-3 text-sm">
                                    {project.amenities.length > 0 && (
                                        <div className="flex justify-between"><span className="text-gray-500">Amenities</span><span className="font-semibold text-gray-900">{project.amenities.length}</span></div>
                                    )}
                                    {project.floorPlans.length > 0 && (
                                        <div className="flex justify-between"><span className="text-gray-500">Floor Plans</span><span className="font-semibold text-gray-900">{project.floorPlans.length}</span></div>
                                    )}
                                    {(featuredImages.length > 0 || activeGalleryImages.length > 0) && (
                                        <div className="flex justify-between"><span className="text-gray-500">Gallery Images</span><span className="font-semibold text-gray-900">{uniqueStrings([
                                            ...featuredImagesResolved,
                                            ...tabImagesResolved.exterior,
                                            ...tabImagesResolved.amenities,
                                            ...tabImagesResolved.interiors,
                                            ...tabImagesResolved.lifestyle,
                                        ]).length}</span></div>
                                    )}
                                    {project.paymentPlans.length > 0 && (
                                        <div className="flex justify-between"><span className="text-gray-500">Payment Plan</span><span className="font-semibold text-amber-600">{project.paymentPlans.map(p => `${p.percentage}%`).join(' / ')}</span></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
