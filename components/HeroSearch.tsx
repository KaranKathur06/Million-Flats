'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uiPriceToAed, type CountryCode } from '@/lib/country'

type ApiResponse = { items?: any[] }

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

// ─── Inline Select ────────────────────────────────────────────────────────────
type SelectOption = { value: string; label?: string }

function HeroSelect({
  label,
  icon,
  value,
  onChange,
  options,
  disabled,
  zIndex = 10,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  disabled?: boolean
  zIndex?: number
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(`[data-hero-select="${label}"]`)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, label])

  const selectedLabel = useMemo(() => {
    const hit = options.find((o) => normalize(o.value) === normalize(value))
    return hit?.label ?? hit?.value ?? value
  }, [options, value])

  const displayLabel = selectedLabel || options[0]?.label || options[0]?.value || label

  return (
    <div
      className="flex flex-col gap-1 min-w-0"
      style={{ position: 'relative', zIndex: open ? 50 : zIndex }}
      data-hero-select={label}
    >
      {/* Label row */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-amber-400/70 flex-shrink-0">{icon}</span>
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{label}</span>
      </div>

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'group w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-left',
          'bg-white/[0.06] hover:bg-white/[0.10] border',
          open
            ? 'border-amber-400/40 ring-1 ring-amber-400/20 bg-white/[0.09]'
            : 'border-white/[0.10] hover:border-white/[0.18]',
          'transition-all duration-200 focus:outline-none',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="text-sm font-medium text-white/90 truncate">{displayLabel}</span>
        <svg
          className={`flex-shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/[0.12] bg-[#0a1828] shadow-[0_24px_48px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{ zIndex: 999 }}
        >
          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {options.map((opt, idx) => {
              const isSelected = normalize(opt.value) === normalize(value)
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={[
                    'w-full text-left px-4 py-2.5 text-[13px] flex items-center justify-between gap-3 transition-colors duration-100',
                    isSelected
                      ? 'bg-amber-400/10 text-amber-300 font-semibold'
                      : 'text-white/70 hover:bg-white/[0.05] hover:text-white/95',
                  ].join(' ')}
                >
                  <span className="truncate">{opt.label ?? opt.value}</span>
                  {isSelected && (
                    <svg className="flex-shrink-0 text-amber-400" width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M16.5 5.5l-8 8-4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Price Input ──────────────────────────────────────────────────────────────
function PriceInput({
  label,
  icon,
  currency,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  currency: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-amber-400/70 flex-shrink-0">{icon}</span>
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{label}</span>
      </div>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xs font-semibold pointer-events-none">
          {currency}
        </span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Any"
          className={[
            'w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium text-white/90',
            'bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] hover:border-white/[0.18]',
            'placeholder:text-white/25 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 focus:bg-white/[0.09]',
            'transition-all duration-200',
          ].join(' ')}
        />
      </div>
    </div>
  )
}

// ─── Icons (inline SVG, no external lib needed) ───────────────────────────────
const IconMap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
  </svg>
)
const IconBuilding = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 9h3M15 15h3M6 9h.01M6 15h.01" />
  </svg>
)
const IconLocation = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="11" r="3" /><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
  </svg>
)
const IconCurrencyDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6M9 9h6M12 12v6M9 15h6" />
  </svg>
)
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HeroSearch() {
  const router = useRouter()

  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [region, setRegion] = useState('')
  const [community, setCommunity] = useState('')
  const [area, setArea] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  // Data fetching with cache
  useEffect(() => {
    let cancelled = false
    const cacheKey = 'mf_projects_cache_v1'

    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        const items = Array.isArray(parsed) ? parsed : []
        if (items.length > 0) {
          setProjects(items)
          setLoading(false)
        }
      }
    } catch { /* ignore */ }

    const load = async (attempt: number) => {
      try {
        const res = await fetch('/api/properties?limit=250', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ApiResponse
        const items = Array.isArray(data?.items) ? data.items : []
        if (cancelled) return
        setProjects(items)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(items)) } catch { /* ignore */ }
      } catch {
        if (cancelled) return
        if (attempt < 2) {
          window.setTimeout(() => { if (!cancelled) void load(attempt + 1) }, 600 * (attempt + 1))
          return
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(0)
    return () => { cancelled = true }
  }, [])

  // Filter options derived from data
  const regionOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) {
      const r = safeString(p?.location?.region)
      if (r) set.add(r)
    }
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b))
    return sorted.length > 0 ? sorted : ['Dubai', 'India']
  }, [projects])

  const communityOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) {
      const r = safeString(p?.location?.region)
      const d = safeString(p?.location?.district)
      if (!d) continue
      if (!region || normalize(r) === normalize(region)) set.add(d)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [projects, region])

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) {
      const r = safeString(p?.location?.region)
      const d = safeString(p?.location?.district)
      const s = safeString(p?.location?.sector)
      if (!s) continue
      const regionOk = !region || normalize(r) === normalize(region)
      const districtOk = !community || normalize(d) === normalize(community)
      if (regionOk && districtOk) set.add(s)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [projects, region, community])

  const currencyCountry: CountryCode = normalize(region) === 'india' ? 'INDIA' : 'UAE'
  const currencySymbol = currencyCountry === 'INDIA' ? '₹' : 'AED'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('limit', '24')
    if (region) params.set('region', region)
    if (community) params.set('community', community)
    if (area) params.set('area', area)
    if (minPrice) {
      const n = Number(minPrice)
      if (Number.isFinite(n) && n > 0) params.set('minPrice', String(uiPriceToAed(currencyCountry, n)))
    }
    if (maxPrice) {
      const n = Number(maxPrice)
      if (Number.isFinite(n) && n > 0) params.set('maxPrice', String(uiPriceToAed(currencyCountry, n)))
    }
    router.push(`/properties?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch}>
      {/* ── Premium glassmorphism card ── */}
      <div
        className="relative overflow-visible rounded-2xl border border-white/[0.12]"
        style={{
          background: 'linear-gradient(135deg, rgba(14,30,54,0.92) 0%, rgba(20,42,72,0.96) 50%, rgba(16,34,60,0.93) 100%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Shimmer accent line at top */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent rounded-full" />

        {/* Card header */}
        <div className="px-5 sm:px-7 pt-5 pb-1 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-amber-400" />
            <span className="text-white/90 text-sm font-semibold">Find Your Property</span>
          </div>
          {loading && (
            <span className="ml-auto flex items-center gap-1.5 text-white/40 text-xs">
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
              Loading filters…
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 sm:mx-7 h-px bg-white/[0.06] my-3" />

        {/* Filter grid */}
        <div className="px-5 sm:px-7 pb-5 sm:pb-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-start">
          {/* Region */}
          <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 40 }}>
            <HeroSelect
              label="Region"
              icon={<IconMap />}
              value={region}
              onChange={(v) => { setRegion(v); setCommunity(''); setArea('') }}
              options={[
                { value: '', label: 'All Regions' },
                ...regionOptions.map((r) => ({ value: r })),
              ]}
              disabled={loading && projects.length === 0}
              zIndex={40}
            />
          </div>

          {/* Community */}
          <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 35 }}>
            <HeroSelect
              label="Community"
              icon={<IconBuilding />}
              value={community}
              onChange={(v) => { setCommunity(v); setArea('') }}
              options={[
                { value: '', label: communityOptions.length === 0 ? 'Select Region First' : 'All Communities' },
                ...communityOptions.map((d) => ({ value: d })),
              ]}
              disabled={(loading && projects.length === 0) || communityOptions.length === 0}
              zIndex={35}
            />
          </div>

          {/* Area */}
          <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 30 }}>
            <HeroSelect
              label="Area"
              icon={<IconLocation />}
              value={area}
              onChange={setArea}
              options={[
                { value: '', label: areaOptions.length === 0 ? 'Select Community First' : 'All Areas' },
                ...areaOptions.map((s) => ({ value: s })),
              ]}
              disabled={(loading && projects.length === 0) || areaOptions.length === 0}
              zIndex={30}
            />
          </div>

          {/* Min Price */}
          <div className="lg:col-span-1">
            <PriceInput
              label="Min Price"
              icon={<IconCurrencyDown />}
              currency={currencySymbol}
              value={minPrice}
              onChange={setMinPrice}
            />
          </div>

          {/* Max Price */}
          <div className="lg:col-span-1">
            <PriceInput
              label="Max Price"
              icon={<IconCurrencyDown />}
              currency={currencySymbol}
              value={maxPrice}
              onChange={setMaxPrice}
            />
          </div>

          {/* CTA */}
          <div className="lg:col-span-1 flex flex-col gap-1">
            {/* Invisible spacer to align with labelled fields */}
            <div className="text-[11px] font-semibold text-transparent uppercase tracking-widest select-none px-1">
              Search
            </div>
            <button
              type="submit"
              className={[
                'group relative w-full py-3 px-6 rounded-xl font-bold text-sm overflow-hidden',
                'bg-gradient-to-r from-amber-400 to-amber-500',
                'text-[#0d1f38]',
                'shadow-[0_4px_20px_rgba(251,191,36,0.35)]',
                'hover:shadow-[0_6px_28px_rgba(251,191,36,0.5)] hover:scale-[1.02]',
                'active:scale-[0.98]',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50',
              ].join(' ')}
            >
              {/* Shimmer sweep on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out pointer-events-none" />
              <span className="relative flex items-center justify-center gap-2">
                <IconSearch />
                Browse Properties
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}