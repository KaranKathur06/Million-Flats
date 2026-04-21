'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PremiumDropdown from '@/components/PremiumDropdown'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface SuggestionProject {
    id: string
    name: string
    slug: string
    city: string | null
    community: string | null
    coverImage: string | null
    developer: string | null
    isFeatured: boolean
}
interface SuggestionDeveloper {
    id: string
    name: string
    slug: string
    logo: string | null
}
interface SuggestionLocation {
    label: string
    type: 'city' | 'community'
    city?: string
}
interface SuggestionsResponse {
    success: boolean
    projects: SuggestionProject[]
    developers: SuggestionDeveloper[]
    locations: SuggestionLocation[]
}
interface SelectOption {
    value: string
    label: string
}

type ActiveTab = 'projects' | 'buy' | 'rent'
type CountryToggle = 'UAE' | 'INDIA'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function trackSearchEvent(event: string, payload: Record<string, unknown>) {
    try {
        fetch('/api/search/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, payload, path: '/' }),
        }).catch(() => { })
    } catch { }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

const IconSearch = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
)

const IconLocation = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="11" r="3" />
        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    </svg>
)

const IconBuilding = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 9h3M15 15h3M6 9h.01M6 15h.01" />
    </svg>
)

const IconCurrency = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M9 9h6M9 15h6" />
    </svg>
)

const IconBed = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4v16" /><path d="M22 4v16" /><path d="M2 12h20" /><path d="M2 20h20" /><path d="M6 12V8a2 2 0 012-2h8a2 2 0 012 2v4" />
    </svg>
)

const IconChevronDown = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="12" height="12" viewBox="0 0 20 20" fill="none">
        <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const IconStar = () => (
    <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
)

/* Old inline FilterSelect removed — now using PremiumDropdown */

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HeroSearch() {
    const router = useRouter()
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // ── State ──────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ActiveTab>('projects')
    const [country, setCountry] = useState<CountryToggle>('UAE')
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [city, setCity] = useState('')
    const [bhk, setBhk] = useState('')
    const [budgetMin, setBudgetMin] = useState('')
    const [budgetMax, setBudgetMax] = useState('')

    // Suggestions
    const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)

    // Filter options (fetched from API)
    const [cityOptions, setCityOptions] = useState<string[]>([])
    const [loadingFilters, setLoadingFilters] = useState(true)

    // ── Debounce query ─────────────────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    // ── Fetch filter options ───────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false
        async function loadFilters() {
            try {
                const res = await fetch('/api/projects/filters', { cache: 'no-store' })
                const json = await res.json()
                if (cancelled) return
                if (json.success) {
                    setCityOptions(Array.isArray(json.cities) ? json.cities : [])
                }
            } catch {
                // fallback
            } finally {
                if (!cancelled) setLoadingFilters(false)
            }
        }
        loadFilters()
        return () => { cancelled = true }
    }, [])

    // ── Fetch autocomplete suggestions ─────────────────────────────────────
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSuggestions(null)
            setShowSuggestions(false)
            return
        }

        let cancelled = false
        setLoadingSuggestions(true)

        async function fetchSuggestions() {
            try {
                const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`)
                const json: SuggestionsResponse = await res.json()
                if (cancelled) return
                setSuggestions(json.success ? json : null)
                setShowSuggestions(true)
            } catch {
                if (!cancelled) setSuggestions(null)
            } finally {
                if (!cancelled) setLoadingSuggestions(false)
            }
        }

        fetchSuggestions()
        return () => { cancelled = true }
    }, [debouncedQuery])

    // ── Close suggestions on click outside ─────────────────────────────────
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ── Currency based on country ──────────────────────────────────────────
    const currencySymbol = country === 'INDIA' ? '₹' : 'AED'

    // ── Count total suggestions ────────────────────────────────────────────
    const totalSuggestions = suggestions
        ? suggestions.projects.length + suggestions.developers.length + suggestions.locations.length
        : 0

    // ── Handle search submit ───────────────────────────────────────────────
    const handleSearch = useCallback((e?: React.FormEvent) => {
        e?.preventDefault()
        const params = new URLSearchParams()

        if (query.trim()) params.set('q', query.trim())
        if (city) params.set('city', city)
        if (bhk) params.set('bhk', bhk)
        if (budgetMin) params.set('budget_min', budgetMin)
        if (budgetMax) params.set('budget_max', budgetMax)
        if (country) params.set('country', country.toLowerCase())

        params.set('page', '1')

        trackSearchEvent('search_initiated', {
            query: query.trim(),
            filters: { city, bhk, budgetMin, budgetMax, country },
        })

        setShowSuggestions(false)

        // Route based on active tab
        if (activeTab === 'projects') {
            router.push(`/projects?${params.toString()}`)
        } else if (activeTab === 'buy') {
            params.set('intent', 'buy')
            router.push(`/properties?${params.toString()}`)
        } else {
            params.set('intent', 'rent')
            router.push(`/properties?${params.toString()}`)
        }
    }, [query, city, bhk, budgetMin, budgetMax, country, activeTab, router])

    // ── Handle suggestion click ────────────────────────────────────────────
    const handleProjectClick = useCallback((slug: string, name: string) => {
        trackSearchEvent('suggestion_clicked', { type: 'project', slug, name })
        setShowSuggestions(false)
        router.push(`/projects/${slug}`)
    }, [router])

    const handleDeveloperClick = useCallback((slug: string, name: string) => {
        trackSearchEvent('suggestion_clicked', { type: 'developer', slug, name })
        setShowSuggestions(false)
        router.push(`/developers/${slug}`)
    }, [router])

    const handleLocationClick = useCallback((label: string, type: string) => {
        trackSearchEvent('suggestion_clicked', { type: 'location', label })
        setShowSuggestions(false)
        setCity(label)
        setQuery('')
        // Auto-trigger search to projects page
        const params = new URLSearchParams()
        params.set('city', label)
        params.set('page', '1')
        if (country) params.set('country', country.toLowerCase())
        router.push(`/projects?${params.toString()}`)
    }, [country, router])

    // ── Keyboard navigation on input ───────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }, [])

    // ── BHK options ────────────────────────────────────────────────────────
    const bhkSelectOptions: SelectOption[] = useMemo(() => [
        { value: '', label: 'Any BHK' },
        { value: '1', label: '1 BHK' },
        { value: '2', label: '2 BHK' },
        { value: '3', label: '3 BHK' },
        { value: '4', label: '4 BHK' },
        { value: '5', label: '5 BHK' },
        { value: '6', label: '6+ BHK' },
    ], [])

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <form onSubmit={handleSearch} className="w-full relative z-30" id="hero-search-form">
            <div
                style={{
                    background: 'linear-gradient(135deg, rgba(10,24,40,0.98) 0%, rgba(16,35,60,0.99) 50%, rgba(10,24,40,0.98) 100%)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
            >
                {/* Shimmer accent line at top */}
                <div className="absolute top-0 left-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                    {/* ── Top Row: Tabs + Country Toggle ── */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.06]">
                            {(['projects', 'buy', 'rent'] as ActiveTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={[
                                        'px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200',
                                        activeTab === tab
                                            ? 'bg-amber-400 text-[#0a1828] shadow-sm shadow-amber-400/20'
                                            : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
                                    ].join(' ')}
                                >
                                    {tab === 'projects' ? 'Projects' : tab === 'buy' ? 'Buy' : 'Rent'}
                                </button>
                            ))}
                        </div>

                        {/* Country Toggle */}
                        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.06]">
                            {(['UAE', 'INDIA'] as CountryToggle[]).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => { setCountry(c); setCity('') }}
                                    className={[
                                        'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5',
                                        country === c
                                            ? 'bg-white/[0.12] text-white border border-white/[0.15] shadow-sm'
                                            : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]',
                                    ].join(' ')}
                                >
                                    <span className="text-base leading-none">{c === 'UAE' ? '🇦🇪' : '🇮🇳'}</span>
                                    {c === 'UAE' ? 'Dubai' : 'India'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Search Input + Autocomplete ── */}
                    <div ref={searchRef} className="relative mb-5" style={{ zIndex: 100 }}>
                        <div className="relative group">
                            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-amber-400 transition-colors z-10" />
                            <input
                                ref={inputRef}
                                id="hero-search-input"
                                type="text"
                                placeholder={
                                    activeTab === 'projects'
                                        ? 'Search projects, developers, or locations…'
                                        : activeTab === 'buy'
                                            ? 'Search properties to buy…'
                                            : 'Search properties to rent…'
                                }
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => debouncedQuery.length >= 2 && setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                                className={[
                                    'w-full pl-12 pr-5 py-4 rounded-2xl text-[15px] font-medium text-white',
                                    'bg-white/[0.07] backdrop-blur-sm border',
                                    showSuggestions && totalSuggestions > 0
                                        ? 'border-amber-400/30 ring-2 ring-amber-400/10 rounded-b-none'
                                        : 'border-white/[0.10]',
                                    'placeholder-white/30',
                                    'hover:bg-white/[0.10] hover:border-white/[0.18]',
                                    'focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 focus:bg-white/[0.09]',
                                    'transition-all duration-200',
                                ].join(' ')}
                            />

                            {/* Loading spinner */}
                            {loadingSuggestions && debouncedQuery.length >= 2 && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <svg className="animate-spin text-amber-400/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* ── Autocomplete Dropdown ── */}
                        {showSuggestions && suggestions && totalSuggestions > 0 && (
                            <div
                                className="absolute top-full left-0 right-0 bg-[#0a1828] border border-t-0 border-white/[0.12] rounded-b-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                                style={{ zIndex: 999 }}
                            >
                                <div className="max-h-[420px] overflow-y-auto py-1 scrollbar-thin">

                                    {/* Projects group */}
                                    {suggestions.projects.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 flex items-center gap-2">
                                                <IconBuilding />
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Projects</span>
                                            </div>
                                            {suggestions.projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleProjectClick(p.slug, p.name)}
                                                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.05] transition-colors duration-100"
                                                >
                                                    {p.coverImage ? (
                                                        <img src={p.coverImage} alt="" className="w-10 h-8 rounded-md object-cover flex-shrink-0 opacity-80" />
                                                    ) : (
                                                        <div className="w-10 h-8 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                                                            <IconBuilding />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm text-white/90 font-medium truncate flex items-center gap-1.5">
                                                            {p.name}
                                                            {p.isFeatured && (
                                                                <span className="text-amber-400"><IconStar /></span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-white/40 truncate">
                                                            {[p.developer, p.community, p.city].filter(Boolean).join(' · ')}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Developers group */}
                                    {suggestions.developers.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 flex items-center gap-2 mt-1 border-t border-white/[0.06]">
                                                <span className="text-amber-400/50"><IconStar /></span>
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Developers</span>
                                            </div>
                                            {suggestions.developers.map((d) => (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={() => handleDeveloperClick(d.slug, d.name)}
                                                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.05] transition-colors duration-100"
                                                >
                                                    {d.logo ? (
                                                        <img src={d.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-white/5 p-0.5" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-white/30 text-xs font-bold">
                                                            {d.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-white/80 font-medium truncate">{d.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Locations group */}
                                    {suggestions.locations.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 flex items-center gap-2 mt-1 border-t border-white/[0.06]">
                                                <span className="text-amber-400/50"><IconLocation /></span>
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Locations</span>
                                            </div>
                                            {suggestions.locations.map((loc, idx) => (
                                                <button
                                                    key={`${loc.label}-${idx}`}
                                                    type="button"
                                                    onClick={() => handleLocationClick(loc.label, loc.type)}
                                                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.05] transition-colors duration-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 text-amber-400/50">
                                                        <IconLocation />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-sm text-white/80 font-medium">{loc.label}</span>
                                                        {loc.city && loc.type === 'community' && (
                                                            <span className="text-[11px] text-white/30 ml-1.5">{loc.city}</span>
                                                        )}
                                                    </div>
                                                    <span className="ml-auto text-[10px] text-white/20 uppercase font-semibold tracking-wider">
                                                        {loc.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom hint */}
                                <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                                    <span className="text-[10px] text-white/25 font-medium">
                                        {totalSuggestions} result{totalSuggestions !== 1 ? 's' : ''} found
                                    </span>
                                    <button
                                        type="submit"
                                        className="text-[11px] text-amber-400/70 font-semibold hover:text-amber-400 transition-colors"
                                    >
                                        Search all →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Filters Row ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">

                        {/* City */}
                        <PremiumDropdown
                            label="City"
                            icon={<IconLocation />}
                            value={city}
                            onChange={setCity}
                            options={[
                                { value: '', label: 'All Cities' },
                                ...cityOptions.map((c) => ({ value: c, label: c })),
                            ]}
                            disabled={loadingFilters}
                            variant="dark"
                            id="hero-filter-city"
                        />

                        {/* BHK */}
                        <PremiumDropdown
                            label="BHK"
                            icon={<IconBed />}
                            value={bhk}
                            onChange={setBhk}
                            options={bhkSelectOptions}
                            variant="dark"
                            id="hero-filter-bhk"
                        />

                        {/* Min Budget */}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 px-1">
                                <span className="text-amber-400/70 flex-shrink-0"><IconCurrency /></span>
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Min Budget</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-[11px] font-semibold pointer-events-none">
                                    {currencySymbol}
                                </span>
                                <input
                                    inputMode="numeric"
                                    value={budgetMin}
                                    onChange={(e) => setBudgetMin(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Any"
                                    className={[
                                        'w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium text-white/90',
                                        'bg-white/[0.06] border border-white/[0.10]',
                                        'hover:bg-white/[0.10] hover:border-white/[0.18]',
                                        'placeholder:text-white/20',
                                        'focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 focus:bg-white/[0.09]',
                                        'transition-all duration-200',
                                    ].join(' ')}
                                />
                            </div>
                        </div>

                        {/* Max Budget */}
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 px-1">
                                <span className="text-amber-400/70 flex-shrink-0"><IconCurrency /></span>
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Max Budget</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-[11px] font-semibold pointer-events-none">
                                    {currencySymbol}
                                </span>
                                <input
                                    inputMode="numeric"
                                    value={budgetMax}
                                    onChange={(e) => setBudgetMax(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Any"
                                    className={[
                                        'w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium text-white/90',
                                        'bg-white/[0.06] border border-white/[0.10]',
                                        'hover:bg-white/[0.10] hover:border-white/[0.18]',
                                        'placeholder:text-white/20',
                                        'focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 focus:bg-white/[0.09]',
                                        'transition-all duration-200',
                                    ].join(' ')}
                                />
                            </div>
                        </div>

                        {/* Search Button — spans remaining columns on lg */}
                        <div className="col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col gap-1">
                            <div className="text-[10px] font-semibold text-transparent uppercase tracking-widest select-none px-1 hidden sm:block">
                                Search
                            </div>
                            <button
                                type="submit"
                                id="hero-search-button"
                                className={[
                                    'group relative w-full py-3 px-6 rounded-xl font-bold text-sm overflow-hidden',
                                    'bg-gradient-to-r from-amber-400 to-amber-500',
                                    'text-[#0a1828]',
                                    'shadow-[0_4px_20px_rgba(251,191,36,0.3)]',
                                    'hover:shadow-[0_6px_28px_rgba(251,191,36,0.45)] hover:scale-[1.02]',
                                    'active:scale-[0.98]',
                                    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50',
                                    'cursor-pointer',
                                ].join(' ')}
                            >
                                {/* Shimmer sweep on hover */}
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out pointer-events-none" />
                                <span className="relative flex items-center justify-center gap-2">
                                    <IconSearch />
                                    {activeTab === 'projects' ? 'Search Projects' : 'Search Properties'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    )
}