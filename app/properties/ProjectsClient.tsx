'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import ProjectListCard, { type ReellyProject } from '@/components/ProjectListCard'
import Pagination from '@/components/Pagination'
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
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(24)

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
    (nextFilters: ProjectFilters, nextPage: number, nextLimit: number) => {
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

      params.set('page', String(nextPage))
      params.set('limit', String(nextLimit))

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

    const nextPage = Math.max(1, safeInt(params.get('page'), 1))
    const nextLimit = Math.min(Math.max(safeInt(params.get('limit'), 24), 12), 60)

    didInitFromUrl.current = true
    setFilters(next)
    setPage(nextPage)
    setLimit(nextLimit)
    if (hasAnyActiveFilter(next)) setHasInteracted(true)
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

  const filteredProjects = useMemo(() => {
    const regionQ = normalize(filters.region)
    const districtQ = normalize(filters.district)
    const sectorQ = normalize(filters.sector)
    const developerQ = normalize(filters.developer)

    const min = filters.min_price ? Number(filters.min_price) : undefined
    const max = filters.max_price ? Number(filters.max_price) : undefined

    return allProjects.filter((p) => {
      if (regionQ && normalize(p.location.region) !== regionQ) return false
      if (districtQ && normalize(p.location.district) !== districtQ) return false
      if (sectorQ && normalize(p.location.sector) !== sectorQ) return false

      if (developerQ && normalize(p.developer) !== developerQ) return false

      if (filters.construction_status && p.construction_status !== filters.construction_status) return false

      if ((min != null || max != null) && p.min_price > 0) {
        if (min != null && Number.isFinite(min) && p.min_price < min) return false
        if (max != null && Number.isFinite(max) && p.min_price > max) return false
      }

      return true
    })
  }, [allProjects, filters])

  const total = filteredProjects.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * limit
  const endIndexExclusive = total === 0 ? 0 : Math.min(startIndex + limit, total)
  const paginatedProjects = useMemo(
    () => filteredProjects.slice(startIndex, endIndexExclusive),
    [endIndexExclusive, filteredProjects, startIndex]
  )

  const showEmpty = hasInteracted && hasAnyActiveFilter(filters) && apiError === '' && total === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">Properties</h1>
          <p className="text-gray-600">
            {total === 0 ? '0 projects' : `Showing ${startIndex + 1}–${endIndexExclusive} of ${total} projects`}
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
                    setPage(1)
                    syncUrl(next, 1, limit)
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
                    setPage(1)
                    syncUrl(next, 1, limit)
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
                    setPage(1)
                    syncUrl(next, 1, limit)
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
                    setPage(1)
                    syncUrl(next, 1, limit)
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
                    setPage(1)
                    syncUrl(next, 1, limit)
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
                    setPage(1)
                    syncUrl({ ...filters }, 1, limit)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1)
                      syncUrl({ ...filters }, 1, limit)
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
                    setPage(1)
                    syncUrl({ ...filters }, 1, limit)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1)
                      syncUrl({ ...filters }, 1, limit)
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
                    setPage(1)
                    syncUrl(next, 1, limit)
                  }}
                  className="w-full h-12 md:h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
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
        ) : showEmpty ? (
          <div className="text-center text-gray-600 py-16">No projects match your filters.</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedProjects.map((p) => (
                <ProjectListCard key={p.id} project={p} />
              ))}
            </div>

            <Pagination
              total={total}
              limit={limit}
              page={safePage}
              onChange={(nextPage: number) => {
                const resolved = Math.min(Math.max(nextPage, 1), totalPages)
                setPage(resolved)
                syncUrl(filters, resolved, limit)
                if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
