'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatAEDCompact } from '@/lib/pricing'
import PremiumDropdown from '@/components/PremiumDropdown'

/* ─── Types ─── */
interface ProjectItem {
    id: string
    name: string
    slug: string
    countryIso2: string | null
    city: string | null
    community: string | null
    description: string | null
    completionYear: number | null
    startingPrice: number | null
    goldenVisa: boolean
    coverImage: string | null
    isFeatured: boolean
    status: string
    createdAt: string
    developer: { id: string; name: string; slug: string | null; logo: string | null } | null
    bhkOptions?: number[]
    _score?: number
}

/* ─── Helpers ─── */
function formatPrice(price: number | null | undefined) {
    if (!price) return null
    return formatAEDCompact(price)
}

/* ─── Icons ─── */
function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    )
}

function LocationIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}

function StarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    )
}

function ChevronIcon({ className, direction }: { className?: string; direction: 'left' | 'right' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {direction === 'left' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
        </svg>
    )
}

function ArrowRight({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
    )
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function ProjectsGridClient() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [projects, setProjects] = useState<ProjectItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [totalProjects, setTotalProjects] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [suggestions, setSuggestions] = useState<string[]>([])

    // Filter options from API
    const [cityOptions, setCityOptions] = useState<string[]>([])
    const [developerOptions, setDeveloperOptions] = useState<string[]>([])

    // ── Read initial filter state from URL params ──────────────────────────
    const [search, setSearch] = useState(searchParams?.get('q') || '')
    const [city, setCity] = useState(searchParams?.get('city') || '')
    const [developer, setDeveloper] = useState(searchParams?.get('developer') || '')
    const [bhk, setBhk] = useState(searchParams?.get('bhk') || '')
    const [goldenVisa, setGoldenVisa] = useState(searchParams?.get('goldenVisa') || '')
    const [country, setCountry] = useState(searchParams?.get('country') || '')
    const [budgetMin, setBudgetMin] = useState(searchParams?.get('budget_min') || '')
    const [budgetMax, setBudgetMax] = useState(searchParams?.get('budget_max') || '')
    const [page, setPage] = useState(parseInt(searchParams?.get('page') || '1', 10) || 1)

    /* debounce search */
    const [debouncedSearch, setDebouncedSearch] = useState(search)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350)
        return () => clearTimeout(t)
    }, [search])

    // ── Fetch filter options ───────────────────────────────────────────────
    const fetchFilterOptions = useCallback(async () => {
        try {
            const res = await fetch('/api/projects/filters', { cache: 'no-store' })
            const json = await res.json()
            if (!json.success) return
            setCityOptions(Array.isArray(json.cities) ? json.cities : [])
            setDeveloperOptions(Array.isArray(json.developers) ? json.developers : [])
        } catch {
            // Fallback remains derived from loaded projects below
        }
    }, [])

    useEffect(() => {
        fetchFilterOptions()
    }, [fetchFilterOptions])

    // ── Update URL when filters change ─────────────────────────────────────
    const updateUrl = useCallback(() => {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('q', debouncedSearch)
        if (city) params.set('city', city)
        if (developer) params.set('developer', developer)
        if (bhk) params.set('bhk', bhk)
        if (goldenVisa === 'true') params.set('goldenVisa', 'true')
        if (country) params.set('country', country)
        if (budgetMin) params.set('budget_min', budgetMin)
        if (budgetMax) params.set('budget_max', budgetMax)
        if (page > 1) params.set('page', String(page))

        const qs = params.toString()
        const newUrl = qs ? `/projects?${qs}` : '/projects'
        router.replace(newUrl, { scroll: false })
    }, [debouncedSearch, city, developer, bhk, goldenVisa, country, budgetMin, budgetMax, page, router])

    useEffect(() => {
        updateUrl()
    }, [updateUrl])

    // ── Fetch projects from unified search API ─────────────────────────────
    const fetchProjects = useCallback(async () => {
        setLoading(true)
        setError('')
        setSuggestions([])
        try {
            const params = new URLSearchParams()
            params.set('page', String(page))
            params.set('limit', '24')
            if (debouncedSearch) params.set('q', debouncedSearch)
            if (city) params.set('city', city)
            if (developer) params.set('developer', developer)
            if (bhk) params.set('bhk', bhk)
            if (goldenVisa === 'true') params.set('goldenVisa', 'true')
            if (country) params.set('country', country)
            if (budgetMin) params.set('budget_min', budgetMin)
            if (budgetMax) params.set('budget_max', budgetMax)

            const res = await fetch(`/api/search/projects?${params.toString()}`, { cache: 'no-store' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load')

            setProjects(json.results || [])
            setTotalProjects(json.total || 0)
            setTotalPages(json.totalPages || 1)
            if (json.suggestions?.length > 0) {
                setSuggestions(json.suggestions)
            }

            // Track no-results
            if (json.total === 0 && debouncedSearch) {
                try {
                    fetch('/api/search/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event: 'no_results_found',
                            payload: { query: debouncedSearch, filters: { city, developer, bhk, country } },
                            path: '/projects',
                        }),
                    }).catch(() => {})
                } catch {}
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }, [page, city, developer, goldenVisa, debouncedSearch, bhk, country, budgetMin, budgetMax])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    /* Reset page when filters change */
    useEffect(() => {
        setPage(1)
    }, [city, developer, goldenVisa, debouncedSearch, bhk, country, budgetMin, budgetMax])

    /* Fallback filter values from loaded projects */
    const fallbackCities = useMemo(() => {
        const s = new Set<string>()
        projects.forEach((p) => { if (p.city) s.add(p.city) })
        return Array.from(s).sort()
    }, [projects])

    const fallbackDevelopers = useMemo(() => {
        const s = new Set<string>()
        projects.forEach((p) => { if (p.developer?.name) s.add(p.developer.name) })
        return Array.from(s).sort()
    }, [projects])

    const uniqueCities = cityOptions.length > 0 ? cityOptions : fallbackCities
    const uniqueDevelopers = developerOptions.length > 0 ? developerOptions : fallbackDevelopers

    // ── Check if any filters active ────────────────────────────────────────
    const hasActiveFilters = !!(debouncedSearch || city || developer || bhk || goldenVisa || country || budgetMin || budgetMax)

    const clearAllFilters = useCallback(() => {
        setSearch('')
        setCity('')
        setDeveloper('')
        setBhk('')
        setGoldenVisa('')
        setCountry('')
        setBudgetMin('')
        setBudgetMax('')
        setPage(1)
    }, [])

    // ── Active filter tags ─────────────────────────────────────────────────
    const filterTags = useMemo(() => {
        const tags: { label: string; key: string; clear: () => void }[] = []
        if (debouncedSearch) tags.push({ label: `"${debouncedSearch}"`, key: 'q', clear: () => setSearch('') })
        if (city) tags.push({ label: city, key: 'city', clear: () => setCity('') })
        if (developer) tags.push({ label: developer, key: 'developer', clear: () => setDeveloper('') })
        if (bhk) tags.push({ label: `${bhk} BHK`, key: 'bhk', clear: () => setBhk('') })
        if (goldenVisa === 'true') tags.push({ label: 'Golden Visa', key: 'goldenVisa', clear: () => setGoldenVisa('') })
        if (country) tags.push({ label: country.toUpperCase(), key: 'country', clear: () => setCountry('') })
        if (budgetMin) tags.push({ label: `Min ${budgetMin}`, key: 'budget_min', clear: () => setBudgetMin('') })
        if (budgetMax) tags.push({ label: `Max ${budgetMax}`, key: 'budget_max', clear: () => setBudgetMax('') })
        return tags
    }, [debouncedSearch, city, developer, bhk, goldenVisa, country, budgetMin, budgetMax])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ─── Hero Banner ─── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1d37] via-[#162d50] to-[#1e3a5f] pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16">
                {/* Decorative grid pattern */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />

                {/* Gradient glow */}
                <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-amber-400/[0.06] blur-3xl" />

                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest mb-5">
                        <StarIcon className="h-3 w-3" />
                        Off-Plan Developments
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-tight">
                        Discover Premium <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">Projects</span>
                    </h1>
                    <p className="mt-5 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
                        Browse exclusive off-plan developments from the UAE&apos;s top developers.
                        Golden Visa eligible properties, luxury towers, and waterfront residences.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-8 max-w-xl mx-auto">
                        <div className="relative group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-amber-400 transition-colors" />
                            <input
                                id="projects-search"
                                type="text"
                                placeholder="Search by project, developer, or location..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-sm pl-12 pr-5 py-4 text-sm text-white placeholder-white/35 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Filters + Grid ─── */}
            <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                {/* Filters Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* City Filter */}
                        <PremiumDropdown
                            id="filter-city"
                            value={city}
                            onChange={setCity}
                            options={[
                                { value: '', label: 'All Cities' },
                                ...uniqueCities.map((c) => ({ value: c, label: c })),
                            ]}
                            variant="light"
                            className="min-w-[140px]"
                        />

                        {/* Developer Filter */}
                        <PremiumDropdown
                            id="filter-developer"
                            value={developer}
                            onChange={setDeveloper}
                            options={[
                                { value: '', label: 'All Developers' },
                                ...uniqueDevelopers.map((d) => ({ value: d, label: d })),
                            ]}
                            variant="light"
                            className="min-w-[160px]"
                        />

                        {/* BHK Filter */}
                        <PremiumDropdown
                            id="filter-bhk"
                            value={bhk}
                            onChange={setBhk}
                            options={[
                                { value: '', label: 'Any BHK' },
                                { value: '1', label: '1 BHK' },
                                { value: '2', label: '2 BHK' },
                                { value: '3', label: '3 BHK' },
                                { value: '4', label: '4 BHK' },
                                { value: '5', label: '5 BHK' },
                                { value: '6', label: '6+ BHK' },
                            ]}
                            variant="light"
                            className="min-w-[120px]"
                        />

                        {/* Golden Visa Filter */}
                        <PremiumDropdown
                            id="filter-golden-visa"
                            value={goldenVisa}
                            onChange={setGoldenVisa}
                            options={[
                                { value: '', label: 'Golden Visa' },
                                { value: 'true', label: 'Eligible Only' },
                            ]}
                            variant="light"
                            className="min-w-[140px]"
                        />
                    </div>

                    {/* Project count + clear */}
                    <div className="sm:ml-auto flex items-center gap-3">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <CloseIcon className="h-3 w-3" />
                                Clear all
                            </button>
                        )}
                        <span className="text-sm text-gray-400">
                            {!loading && (
                                <span>{totalProjects} project{totalProjects !== 1 ? 's' : ''} found</span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Active Filter Tags */}
                {filterTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {filterTags.map((tag) => (
                            <span
                                key={tag.key}
                                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800"
                            >
                                {tag.label}
                                <button
                                    type="button"
                                    onClick={tag.clear}
                                    className="hover:text-amber-900 transition-colors cursor-pointer"
                                >
                                    <CloseIcon className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                                <div className="aspect-[16/10] bg-gray-100" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                                    <div className="h-10 bg-gray-100 rounded-xl mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid */}
                {!loading && projects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && projects.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                            <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">No projects found</h3>
                        <p className="mt-1 text-sm text-gray-400 max-w-md">
                            {debouncedSearch
                                ? `No projects match "${debouncedSearch}". Try adjusting your filters.`
                                : 'Try adjusting your filters or search query'
                            }
                        </p>

                        {/* Suggestions */}
                        {suggestions.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Try these instead:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setSearch(s)}
                                            className="text-sm text-amber-600 bg-amber-50 rounded-full px-4 py-1.5 font-medium hover:bg-amber-100 transition-colors cursor-pointer"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 text-sm text-amber-600 font-semibold hover:text-amber-700 transition-colors cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Previous page"
                        >
                            <ChevronIcon className="h-4 w-4" direction="left" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .map((p, idx, arr) => {
                                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
                                return (
                                    <span key={p} className="contents">
                                        {showEllipsis && <span className="px-1 text-gray-300">…</span>}
                                        <button
                                            type="button"
                                            onClick={() => setPage(p)}
                                            className={`inline-flex items-center justify-center h-10 w-10 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${p === page
                                                ? 'bg-dark-blue text-white shadow-sm'
                                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                )
                            })}
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            aria-label="Next page"
                        >
                            <ChevronIcon className="h-4 w-4" direction="right" />
                        </button>
                    </div>
                )}
            </section>

            {/* ─── CTA Section ─── */}
            <section className="bg-gradient-to-r from-[#0c1d37] to-[#1e3a5f] py-16">
                <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                        Can&apos;t Find What You&apos;re Looking For?
                    </h2>
                    <p className="text-white/60 text-base mb-8 max-w-xl mx-auto">
                        Our real estate experts can help you find the perfect off-plan investment. Register your interest and we&apos;ll reach out.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-8 py-3.5 text-sm font-bold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 cursor-pointer"
                    >
                        Contact Our Experts
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    )
}

/* ═══════════════════════════════════════════════
   PROJECT CARD
   ═══════════════════════════════════════════════ */
function ProjectCard({ project }: { project: ProjectItem }) {
    const fallbackImage = '/images/default-property.jpg'
    const [imgSrc, setImgSrc] = useState(project.coverImage || fallbackImage)

    const price = formatPrice(project.startingPrice)
    const location = [project.community, project.city].filter(Boolean).join(' • ')

    // Track click
    const handleClick = () => {
        try {
            fetch('/api/search/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'search_result_clicked',
                    payload: { projectId: project.id, slug: project.slug, name: project.name },
                    path: '/projects',
                }),
            }).catch(() => {})
        } catch {}
    }

    return (
        <Link
            href={`/projects/${project.slug}`}
            id={`project-card-${project.slug}`}
            onClick={handleClick}
            className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer"
        >
            {/* Gold accent line */}
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

            {/* Featured badge */}
            {project.isFeatured && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm uppercase tracking-wider">
                        <StarIcon className="h-2.5 w-2.5" />
                        Featured
                    </span>
                </div>
            )}

            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={project.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={() => {
                            if (imgSrc !== fallbackImage) {
                                setImgSrc(fallbackImage)
                            }
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <svg className="h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                    {project.goldenVisa && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-black shadow-sm">
                            <StarIcon className="h-3 w-3" />
                            Golden Visa
                        </span>
                    )}
                </div>

                {/* Developer badge */}
                {project.developer && (
                    <div className="absolute bottom-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white/90">
                            {project.developer.logo && (
                                <img src={project.developer.logo} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                            )}
                            {project.developer.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-[1.05rem] font-bold text-dark-blue leading-snug line-clamp-2 mb-1.5 group-hover:text-amber-600 transition-colors">
                    {project.name}
                </h3>

                {location && (
                    <p className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <LocationIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{location}</span>
                    </p>
                )}

                {/* BHK options */}
                {project.bhkOptions && project.bhkOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {project.bhkOptions.map((b) => (
                            <span key={b} className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
                                {b} BHK
                            </span>
                        ))}
                    </div>
                )}

                {/* Completion year */}
                {project.completionYear && (
                    <p className="text-xs text-gray-400 mb-3">
                        Completion: <span className="font-medium text-gray-500">{project.completionYear}</span>
                    </p>
                )}

                {/* Price + CTA */}
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                        {price ? (
                            <p className="text-sm font-bold text-dark-blue">
                                From {price}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400 font-medium">Price on request</p>
                        )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:text-amber-700 transition-colors">
                        View Project
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </Link>
    )
}
