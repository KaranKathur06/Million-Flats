'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
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

  const [amenitiesOpen, setAmenitiesOpen] = useState(false)
  const [amenitiesLoading, setAmenitiesLoading] = useState(false)
  const [amenitiesPayload, setAmenitiesPayload] = useState<AmenitiesIndexPayload | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
                <SelectDropdown
                  label="Construction Status"
                  value={filters.construction_status}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, construction_status: v as any }
                    setFilters(next)
                    syncUrl(next, selectedAmenities)
                  }}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'under_construction', label: 'Under Construction' },
                  ]}
                />
              </div>

              <div className="md:col-span-3">
                <SelectDropdown
                  label="Developer"
                  value={filters.developer}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, developer: v }
                    setFilters(next)
                    syncUrl(next, selectedAmenities)
                  }}
                  options={[
                    { value: '', label: 'All Developers' },
                    ...Array.from(new Set(allProjects.map((p) => p.developer))).sort((a, b) => a.localeCompare(b)).map((d) => ({ value: d })),
                  ]}
                />
              </div>

              <div className="md:col-span-3">
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

              <div className="md:col-span-3">
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

              <div className="md:col-span-3 flex items-end">
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
                  className="w-full h-12 md:h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setAmenitiesOpen((v) => !v)}
                  className="text-sm font-semibold text-dark-blue hover:underline"
                >
                  Amenities{selectedAmenities.length > 0 ? ` (${selectedAmenities.length})` : ''}
                </button>
                {selectedAmenities.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHasInteracted(true)
                      setSelectedAmenities([])
                      syncUrl(filters, [])
                    }}
                    className="text-xs font-semibold text-gray-600 hover:text-dark-blue"
                  >
                    Clear Amenities
                  </button>
                ) : null}
              </div>

              {amenitiesOpen ? (
                <div className="mt-3">
                  {amenitiesLoading ? (
                    <div className="text-sm text-gray-600">Loading amenities…</div>
                  ) : availableAmenities.length === 0 ? (
                    <div className="text-sm text-gray-600">Amenities are not available yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {availableAmenities.map((a) => {
                        const selected = selectedAmenities.some((x) => normalize(x) === normalize(a))
                        const iconUrl = amenityIconByName[a] || ''
                        const unoptimized = iconUrl.startsWith('http')

                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => {
                              setHasInteracted(true)
                              const next = selected
                                ? selectedAmenities.filter((x) => normalize(x) !== normalize(a))
                                : [...selectedAmenities, a]
                              setSelectedAmenities(next)
                              syncUrl(filters, next)
                            }}
                            className={`h-10 rounded-xl border px-3 text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                              selected
                                ? 'bg-dark-blue text-white border-dark-blue'
                                : 'bg-white text-dark-blue border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <span className="relative w-5 h-5 shrink-0 rounded-md border border-gray-200 bg-white overflow-hidden">
                              <Image
                                src={iconUrl || '/image-placeholder.svg'}
                                alt={a}
                                fill
                                className="object-contain p-0.5"
                                unoptimized={unoptimized}
                                loading="lazy"
                              />
                            </span>
                            <span className="truncate">{a}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {apiError ? (
          <div className="text-center text-gray-700 py-10">
            <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
              <p className="font-semibold text-dark-blue">Projects are unavailable right now.</p>
              <p className="mt-2 text-sm text-gray-600">{apiError}</p>
            </div>
          </div>
        ) : showAmenitiesPending ? (
          <div className="text-center text-gray-600 py-16">Loading amenities data to apply your filter…</div>
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
