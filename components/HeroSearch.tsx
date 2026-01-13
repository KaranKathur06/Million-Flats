'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'
import { uiPriceToAed, type CountryCode } from '@/lib/country'

type ApiResponse = { items?: any[] }

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

export default function HeroSearch() {
  const router = useRouter()

  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [region, setRegion] = useState('')
  const [community, setCommunity] = useState('')
  const [area, setArea] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

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
    } catch {
      // ignore
    }

    const load = async (attempt: number) => {
      try {
        const res = await fetch('/api/properties?limit=250', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as ApiResponse
        const items = Array.isArray(data?.items) ? data.items : []
        if (cancelled) return
        setProjects(items)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(items))
        } catch {
          // ignore
        }
      } catch {
        if (cancelled) return
        if (attempt < 2) {
          window.setTimeout(() => {
            if (!cancelled) void load(attempt + 1)
          }, 600 * (attempt + 1))
          return
        }
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    setLoading((prev) => prev && projects.length === 0)
    void load(0)

    return () => {
      cancelled = true
    }
  }, [])

  const regionOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) {
      const r = safeString(p?.location?.region)
      if (r) set.add(r)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const effectiveRegionOptions = useMemo(() => {
    if (regionOptions.length > 0) return regionOptions
    return ['Dubai', 'India']
  }, [regionOptions])

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

  const currencyCountry: CountryCode = normalize(region) === 'india' ? 'India' : 'UAE'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()

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

    router.push(`/properties${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <form
      onSubmit={handleSearch}
      className="w-[94%] mx-auto md:w-full bg-black/30 md:bg-dark-blue/80 backdrop-blur-lg md:backdrop-blur-md border border-white/15 md:border-white/10 rounded-2xl p-4 md:p-7 shadow-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-stretch">
        <div className="md:col-span-1">
          <SelectDropdown
            variant="dark"
            label="Region"
            value={region}
            onChange={(v) => {
              setRegion(v)
              setCommunity('')
              setArea('')
            }}
            options={[{ value: '', label: 'All Regions' }, ...effectiveRegionOptions.map((r) => ({ value: r }))]}
            disabled={loading && projects.length === 0}
          />
        </div>

        <div className="md:col-span-1">
          <SelectDropdown
            variant="dark"
            label="Community"
            value={community}
            onChange={(v) => {
              setCommunity(v)
              setArea('')
            }}
            options={[{ value: '', label: 'All Communities' }, ...communityOptions.map((d) => ({ value: d }))]}
            disabled={(loading && projects.length === 0) || communityOptions.length === 0}
          />
        </div>

        <div className="md:col-span-1">
          <SelectDropdown
            variant="dark"
            label="Area"
            value={area}
            onChange={setArea}
            options={[{ value: '', label: 'All Areas' }, ...areaOptions.map((s) => ({ value: s }))]}
            disabled={(loading && projects.length === 0) || areaOptions.length === 0}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-white/80 mb-1">Min Price ({currencyCountry === 'India' ? '₹' : 'AED'})</label>
          <div className="relative">
            <input
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter amount"
              className="w-full h-12 md:h-14 px-4 rounded-xl bg-white/10 text-white text-sm font-semibold placeholder:text-white/40 border border-white/15 md:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
            />
          </div>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-white/80 mb-1">Max Price ({currencyCountry === 'India' ? '₹' : 'AED'})</label>
          <div className="relative">
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter amount"
              className="w-full h-12 md:h-14 px-4 rounded-xl bg-white/10 text-white text-sm font-semibold placeholder:text-white/40 border border-white/15 md:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
            />
          </div>
        </div>

        <div className="md:col-span-1 flex flex-col">
          <div className="block text-xs font-semibold text-white/80 mb-1 opacity-0 select-none">Browse Properties</div>
          <button
            type="submit"
            className="w-full h-12 md:h-14 bg-accent-yellow text-dark-blue rounded-xl font-semibold hover:bg-accent-yellow/90 transition-colors"
          >
            Browse Properties
          </button>
        </div>
      </div>
    </form>
  )
}