'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import ProjectListCard, { type ReellyProject } from '@/components/ProjectListCard'
import SelectDropdown from '@/components/SelectDropdown'

type ProjectFilters = {
  region: string
  district: string
  sector: string
  construction_status: '' | 'completed' | 'under_construction'
  min_price: string
  max_price: string
  developer: string
}

type Props = {
  seedItems: unknown[]
  apiError: string
}

type AmenitiesIndexPayload = {
  generatedAt: number
  items: Array<{ projectId: number; amenities: string[] }>
  amenities: string[]
  amenityIcons: Record<string, string>
}

const PAGE_SIZE = 24

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function asProject(item: any): ReellyProject | null {
  const id = safeNumber(item?.id)
  if (!id) return null

  const name = safeString(item?.name)
  const developer = safeString(item?.developer)
  const sale_status = item?.sale_status
  const construction_status = item?.construction_status
  const completion_date = safeString(item?.completion_date)

  const location = item?.location
  const region = safeString(location?.region)
  const district = safeString(location?.district)
  const sector = safeString(location?.sector)
  const country = safeNumber(location?.country)

  if (!name || !developer || !region || !district || !sector) {
    // If required display fields are missing, drop the record to avoid broken UI.
    return null
  }

  if (sale_status !== 'on_sale') return null
  if (construction_status !== 'completed' && construction_status !== 'under_construction') return null

  return {
    id,
    name,
    developer,
    sale_status,
    construction_status,
    completion_date,
    min_price: safeNumber(item?.min_price),
    max_price: safeNumber(item?.max_price),
    location: {
      country,
      region,
      district,
      sector,
    },
    cover_image: {
      url: safeString(item?.cover_image?.url),
    },
  }
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

function hasAnyActiveFilter(f: ProjectFilters) {
  return Boolean(
    f.region ||
      f.district ||
      f.sector ||
      f.construction_status ||
      f.min_price ||
      f.max_price ||
      f.developer
  )
}

function safeInt(v: string | null | undefined, fallback: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

export default function ProjectsClient({ seedItems, apiError }: Props) {
  const pathname = usePathname()
  const [hasInteracted, setHasInteracted] = useState(false)

  const didInitFromUrl = useRef(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isAppending, setIsAppending] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [amenitiesLoading, setAmenitiesLoading] = useState(false)
  const [amenitiesPayload, setAmenitiesPayload] = useState<AmenitiesIndexPayload | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [moreFiltersVisible, setMoreFiltersVisible] = useState(false)
  const [draft, setDraft] = useState<{ construction_status: ProjectFilters['construction_status']; developer: string; amenities: string[] }>(
    {
      construction_status: '',
      developer: '',
      amenities: [],
    }
  )

  const [filters, setFilters] = useState<ProjectFilters>({
    region: '',
    district: '',
    sector: '',
    construction_status: '',
    min_price: '',
    max_price: '',
    developer: '',
  })

  const syncUrl = useCallback(
    (nextFilters: ProjectFilters, nextAmenities: string[]) => {
      if (typeof window === 'undefined') return

      const params = new URLSearchParams(window.location.search)

      if (nextFilters.region) params.set('region', nextFilters.region)
      else params.delete('region')

      if (nextFilters.district) params.set('community', nextFilters.district)
      else params.delete('community')

      if (nextFilters.sector) params.set('area', nextFilters.sector)
      else params.delete('area')

      if (nextFilters.construction_status) params.set('constructionStatus', nextFilters.construction_status)
      else params.delete('constructionStatus')

      if (nextFilters.min_price) params.set('minPrice', nextFilters.min_price)
      else params.delete('minPrice')

      if (nextFilters.max_price) params.set('maxPrice', nextFilters.max_price)
      else params.delete('maxPrice')

      if (nextFilters.developer) params.set('developer', nextFilters.developer)
      else params.delete('developer')

      if (nextAmenities.length > 0) params.set('amenities', nextAmenities.join('|'))
      else params.delete('amenities')

      params.set('page', '1')
      params.set('limit', String(PAGE_SIZE))

      const nextUrl = `${pathname}?${params.toString()}`
      window.history.replaceState(null, '', nextUrl)
    },
    [pathname]
  )

  useEffect(() => {
    if (didInitFromUrl.current) return
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)

    const region = safeString(params.get('region'))
    const community = safeString(params.get('community'))
    const area = safeString(params.get('area'))
    const constructionStatus = safeString(params.get('constructionStatus'))
    const minPrice = safeString(params.get('minPrice'))
    const maxPrice = safeString(params.get('maxPrice'))
    const developer = safeString(params.get('developer'))
    const amenitiesParam = safeString(params.get('amenities'))

    const next: ProjectFilters = {
      region,
      district: community,
      sector: area,
      construction_status:
        constructionStatus === 'completed' || constructionStatus === 'under_construction' ? (constructionStatus as any) : '',
      min_price: minPrice.replace(/[^0-9]/g, ''),
      max_price: maxPrice.replace(/[^0-9]/g, ''),
      developer,
    }

    const nextAmenities = amenitiesParam
      ? amenitiesParam
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    didInitFromUrl.current = true
    setFilters(next)
    setSelectedAmenities(nextAmenities)
    setVisibleCount(PAGE_SIZE)
    if (hasAnyActiveFilter(next) || nextAmenities.length > 0) setHasInteracted(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadAmenities = async () => {
      try {
        setAmenitiesLoading(true)
        const res = await fetch('/api/amenities-index', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const json = (await res.json()) as AmenitiesIndexPayload
        if (cancelled) return
        if (json && Array.isArray(json.items) && Array.isArray(json.amenities) && typeof json.amenityIcons === 'object') {
          setAmenitiesPayload(json)
        }
      } catch {
        if (cancelled) return
      } finally {
        if (cancelled) return
        setAmenitiesLoading(false)
      }
    }

    void loadAmenities()
    return () => {
      cancelled = true
    }
  }, [])

  const allProjects = useMemo(() => {
    const list = Array.isArray((seedItems as any) as unknown[]) ? (seedItems as unknown[]) : []
    return list.map((i: any) => asProject(i)).filter(Boolean) as ReellyProject[]
  }, [seedItems])

  const developerOptions = useMemo(() => {
    return Array.from(new Set(allProjects.map((p) => p.developer)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [allProjects])

  const regionOptions = useMemo(() => {
    const set = new Set<string>()
    allProjects.forEach((p) => {
      if (p.location?.region) set.add(p.location.region)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allProjects])

  const districtOptions = useMemo(() => {
    const set = new Set<string>()
    allProjects.forEach((p) => {
      if (!filters.region || normalize(p.location.region) === normalize(filters.region)) {
        if (p.location?.district) set.add(p.location.district)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allProjects, filters.region])

  const sectorOptions = useMemo(() => {
    const set = new Set<string>()
    allProjects.forEach((p) => {
      const regionOk = !filters.region || normalize(p.location.region) === normalize(filters.region)
      const districtOk = !filters.district || normalize(p.location.district) === normalize(filters.district)
      if (regionOk && districtOk) {
        if (p.location?.sector) set.add(p.location.sector)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allProjects, filters.district, filters.region])

  const amenityIconByName = useMemo(() => {
    return amenitiesPayload?.amenityIcons ?? {}
  }, [amenitiesPayload])

  const openMoreFilters = useCallback(() => {
    setDraft({
      construction_status: filters.construction_status,
      developer: filters.developer,
      amenities: [...selectedAmenities],
    })
    setMoreFiltersOpen(true)
    requestAnimationFrame(() => setMoreFiltersVisible(true))
  }, [filters.construction_status, filters.developer, selectedAmenities])

  const closeMoreFilters = useCallback(() => {
    setMoreFiltersVisible(false)
    window.setTimeout(() => setMoreFiltersOpen(false), 220)
  }, [])

  const curatedAmenities = useMemo(() => {
    if (!moreFiltersOpen) return [] as string[]
    if (!amenitiesPayload) return [] as string[]

    const freq = new Map<string, number>()
    const labelByKey = new Map<string, string>()
    const rows = Array.isArray(amenitiesPayload.items) ? amenitiesPayload.items : []
    for (const r of rows) {
      const list = Array.isArray((r as any)?.amenities) ? ((r as any).amenities as unknown[]) : []
      for (const a of list) {
        if (typeof a !== 'string') continue
        const label = a.trim()
        if (!label) continue
        const k = normalize(label)
        if (!k) continue
        labelByKey.set(k, labelByKey.get(k) ?? label)
        freq.set(k, (freq.get(k) ?? 0) + 1)
      }
    }

    const entries = Array.from(freq.entries()).map(([k, count]) => ({
      key: k,
      label: labelByKey.get(k) ?? k,
      count,
    }))

    entries.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

    return entries.slice(0, 24).map((e) => e.label)
  }, [amenitiesPayload, moreFiltersOpen])

  const amenitiesFilterPending = selectedAmenities.length > 0 && !amenitiesPayload

  const filterKey = useMemo(() => {
    const amenityKey = selectedAmenities.map((a) => normalize(a)).sort().join('|')
    return [
      filters.region,
      filters.district,
      filters.sector,
      filters.construction_status,
      filters.min_price,
      filters.max_price,
      filters.developer,
      amenityKey,
    ].join('||')
  }, [filters, selectedAmenities])

  const availableAmenities = useMemo(() => {
    const list = Array.isArray(amenitiesPayload?.amenities) ? amenitiesPayload!.amenities : []
    const set = new Set<string>()
    for (const a of list) {
      if (typeof a === 'string' && a.trim()) set.add(a.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [amenitiesPayload])

  const amenitiesByProjectId = useMemo(() => {
    const m = new Map<number, Set<string>>()
    const rows = Array.isArray(amenitiesPayload?.items) ? amenitiesPayload!.items : []
    for (const r of rows) {
      const id = safeNumber((r as any)?.projectId)
      if (!id) continue
      const list = Array.isArray((r as any)?.amenities) ? ((r as any).amenities as unknown[]) : []
      const set = new Set<string>()
      for (const a of list) {
        if (typeof a !== 'string') continue
        const k = normalize(a)
        if (k) set.add(k)
      }
      m.set(id, set)
    }
    return m
  }, [amenitiesPayload])

  const filteredProjects = useMemo(() => {
    const regionQ = normalize(filters.region)
    const districtQ = normalize(filters.district)
    const sectorQ = normalize(filters.sector)
    const developerQ = normalize(filters.developer)

    const selectedAmenityKeys = selectedAmenities.map((a) => normalize(a)).filter(Boolean)

    const min = filters.min_price ? Number(filters.min_price) : undefined
    const max = filters.max_price ? Number(filters.max_price) : undefined

    return allProjects.filter((p) => {
      if (regionQ && normalize(p.location.region) !== regionQ) return false
      if (districtQ && normalize(p.location.district) !== districtQ) return false
      if (sectorQ && normalize(p.location.sector) !== sectorQ) return false

      if (developerQ && normalize(p.developer) !== developerQ) return false

      if (filters.construction_status && p.construction_status !== filters.construction_status) return false

      if (selectedAmenityKeys.length > 0) {
        if (!amenitiesPayload) return false
        const set = amenitiesByProjectId.get(p.id)
        if (!set) return false
        if (!selectedAmenityKeys.every((k) => set.has(k))) return false
      }

      if ((min != null || max != null) && p.min_price > 0) {
        if (min != null && Number.isFinite(min) && p.min_price < min) return false
        if (max != null && Number.isFinite(max) && p.min_price > max) return false
      }

      return true
    })
  }, [allProjects, amenitiesByProjectId, amenitiesPayload, filters, selectedAmenities])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setIsAppending(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filterKey])

  const total = filteredProjects.length
  const visibleProjects = useMemo(() => {
    const n = Math.min(Math.max(visibleCount, PAGE_SIZE), total)
    return filteredProjects.slice(0, n)
  }, [filteredProjects, total, visibleCount])

  const hasMore = visibleProjects.length < total

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    if (!hasMore) return

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (!hit) return
        if (isAppending) return

        setIsAppending(true)
        setVisibleCount((prev) => prev + PAGE_SIZE)
        window.setTimeout(() => setIsAppending(false), 120)
      },
      { rootMargin: '240px' }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, isAppending])

  const showEmpty =
    hasInteracted && (hasAnyActiveFilter(filters) || selectedAmenities.length > 0) && apiError === '' && total === 0 && !amenitiesFilterPending

  const showAmenitiesPending = amenitiesFilterPending && amenitiesLoading
  const showAmenitiesUnavailable = amenitiesFilterPending && !amenitiesLoading

  const skeletonCount = useMemo(() => {
    if (!isAppending) return 0
    return 6
  }, [isAppending])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">Properties</h1>
          <p className="text-gray-600">
            {total === 0 ? '0 projects' : `Showing 1–${visibleProjects.length} of ${total} projects`}
          </p>
        </div>

        <div className="sticky top-14 md:top-20 z-30 mb-6 md:mb-10">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-3">
            <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
              <div className="md:col-span-2">
                <SelectDropdown
                  label="Region"
                  value={filters.region}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, region: v, district: '', sector: '' }
                    setFilters(next)
                    syncUrl(next, selectedAmenities)
                  }}
                  options={[{ value: '', label: 'All Regions' }, ...regionOptions.map((r) => ({ value: r }))]}
                />
              </div>

              <div className="md:col-span-2">
                <SelectDropdown
                  label="Community"
                  value={filters.district}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, district: v, sector: '' }
                    setFilters(next)
                    syncUrl(next, selectedAmenities)
                  }}
                  options={[{ value: '', label: 'All Communities' }, ...districtOptions.map((d) => ({ value: d }))]}
                  disabled={districtOptions.length === 0}
                />
              </div>

              <div className="md:col-span-2">
                <SelectDropdown
                  label="Area"
                  value={filters.sector}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, sector: v }
                    setFilters(next)
                    syncUrl(next, selectedAmenities)
                  }}
                  options={[{ value: '', label: 'All Areas' }, ...sectorOptions.map((s) => ({ value: s }))]}
                  disabled={sectorOptions.length === 0}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Min Price (AED)</label>
                <input
                  value={filters.min_price}
                  onChange={(e) => {
                    setHasInteracted(true)
                    setFilters((prev) => ({ ...prev, min_price: e.target.value.replace(/[^0-9]/g, '') }))
                  }}
                  onBlur={() => {
                    syncUrl({ ...filters }, selectedAmenities)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      syncUrl({ ...filters }, selectedAmenities)
                    }
                  }}
                  inputMode="numeric"
                  placeholder="e.g. 500000"
                  className="w-full h-12 md:h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price (AED)</label>
                <input
                  value={filters.max_price}
                  onChange={(e) => {
                    setHasInteracted(true)
                    setFilters((prev) => ({ ...prev, max_price: e.target.value.replace(/[^0-9]/g, '') }))
                  }}
                  onBlur={() => {
                    syncUrl({ ...filters }, selectedAmenities)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      syncUrl({ ...filters }, selectedAmenities)
                    }
                  }}
                  inputMode="numeric"
                  placeholder="e.g. 2000000"
                  className="w-full h-12 md:h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openMoreFilters}
                className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
              >
                More Filters
                {filters.construction_status || filters.developer || selectedAmenities.length > 0
                  ? ` (${Number(Boolean(filters.construction_status)) + Number(Boolean(filters.developer)) + Number(selectedAmenities.length > 0)})`
                  : ''}
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasInteracted(true)
                  const next: ProjectFilters = {
                    region: '',
                    district: '',
                    sector: '',
                    construction_status: '',
                    min_price: '',
                    max_price: '',
                    developer: '',
                  }
                  setFilters(next)
                  setSelectedAmenities([])
                  syncUrl(next, [])
                }}
                className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {moreFiltersOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button
              type="button"
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                moreFiltersVisible ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Close"
              onClick={closeMoreFilters}
            />
            <div
              className={`relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 transition-all duration-200 ${
                moreFiltersVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-dark-blue">More Filters</h2>
                <button
                  type="button"
                  onClick={closeMoreFilters}
                  className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[70vh] overflow-auto pr-1">
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-dark-blue mb-3">Availability</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 opacity-70">
                      <input type="checkbox" checked disabled />
                      <span className="text-sm font-semibold text-dark-blue">Available Only</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                      <input
                        type="checkbox"
                        checked={draft.construction_status === 'under_construction'}
                        onChange={(e) => {
                          setDraft((prev) => ({
                            ...prev,
                            construction_status: e.target.checked ? 'under_construction' : '',
                          }))
                        }}
                      />
                      <span className="text-sm font-semibold text-dark-blue">Off-Plan Only</span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                      <input
                        type="checkbox"
                        checked={draft.construction_status === 'completed'}
                        onChange={(e) => {
                          setDraft((prev) => ({
                            ...prev,
                            construction_status: e.target.checked ? 'completed' : '',
                          }))
                        }}
                      />
                      <span className="text-sm font-semibold text-dark-blue">Ready Homes Only</span>
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-dark-blue mb-3">Developer</h3>
                  <SelectDropdown
                    label="Developer"
                    value={draft.developer}
                    onChange={(v) => setDraft((prev) => ({ ...prev, developer: v }))}
                    options={[{ value: '', label: 'All Developers' }, ...developerOptions.map((d) => ({ value: d }))]}
                  />
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-dark-blue">Amenities</h3>
                    {draft.amenities.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, amenities: [] }))}
                        className="text-xs font-semibold text-gray-600 hover:text-dark-blue"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {amenitiesLoading ? (
                    <div className="text-sm text-gray-600">Loading amenities…</div>
                  ) : curatedAmenities.length === 0 ? (
                    <div className="text-sm text-gray-600">Amenities are not available yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {curatedAmenities.map((a) => {
                        const checked = draft.amenities.some((x) => normalize(x) === normalize(a))
                        return (
                          <label key={a} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...draft.amenities, a]
                                  : draft.amenities.filter((x) => normalize(x) !== normalize(a))
                                setDraft((prev) => ({ ...prev, amenities: next }))
                              }}
                            />
                            <span className="text-sm text-dark-blue truncate">{a}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, construction_status: '', developer: '', amenities: [] }))
                  }}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={closeMoreFilters}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasInteracted(true)
                    const next: ProjectFilters = {
                      ...filters,
                      construction_status: draft.construction_status,
                      developer: draft.developer,
                    }
                    setFilters(next)
                    setSelectedAmenities(draft.amenities)
                    syncUrl(next, draft.amenities)
                    closeMoreFilters()
                  }}
                  className="h-11 px-5 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90 transition-colors"
                >
                  Update Filters
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {apiError ? (
          <div className="text-center text-gray-700 py-10">
            <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
              <p className="font-semibold text-dark-blue">Projects are unavailable right now.</p>
              <p className="mt-2 text-sm text-gray-600">{apiError}</p>
            </div>
          </div>
        ) : showAmenitiesPending ? (
          <div className="text-center text-gray-600 py-16">Loading amenities data to apply your filter…</div>
        ) : showAmenitiesUnavailable ? (
          <div className="text-center text-gray-600 py-16">Amenities are unavailable right now. Please clear amenities to continue browsing.</div>
        ) : showEmpty ? (
          <div className="text-center text-gray-600 py-16">No projects match your filters.</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleProjects.map((p) => (
                <ProjectListCard key={p.id} project={p} />
              ))}

              {skeletonCount > 0
                ? Array.from({ length: skeletonCount }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
                      <div className="p-5 space-y-3">
                        <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-11 w-full bg-gray-200 rounded-xl animate-pulse" />
                      </div>
                    </div>
                  ))
                : null}
            </div>

            <div className="mt-10">
              {hasMore ? (
                <div className="text-center text-sm text-gray-600">
                  <div ref={loadMoreRef} className="h-8" />
                  <p className="mt-2">Loading more properties…</p>
                </div>
              ) : total > 0 ? (
                <div className="text-center text-sm text-gray-600">You’ve reached the end of the list.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
