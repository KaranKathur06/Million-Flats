'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ProjectListCard, { type ReellyProject } from '@/components/ProjectListCard'
import Pagination from '@/components/Pagination'
import SelectDropdown from '@/components/SelectDropdown'

type ProjectFilters = {
  region: string
  district: string
  sector: string
  sale_status: '' | 'on_sale' | 'out_of_stock'
  construction_status: '' | 'completed' | 'under_construction'
  min_price: string
  max_price: string
}

type Props = {
  items: unknown[]
  total: number
  apiError: string
  facetItems: unknown[]
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

  if (sale_status !== 'on_sale' && sale_status !== 'out_of_stock') return null
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
      f.sale_status ||
      f.construction_status ||
      f.min_price ||
      f.max_price
  )
}

export default function ProjectsClient({ items, total, apiError, facetItems }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hasInteracted, setHasInteracted] = useState(false)

  const page = useMemo(() => {
    const raw = searchParams?.get('page') ?? ''
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  }, [searchParams])

  const limit = useMemo(() => {
    const raw = searchParams?.get('limit') ?? ''
    const n = Number(raw)
    const resolved = Number.isFinite(n) && n > 0 ? Math.floor(n) : 50
    return Math.min(Math.max(resolved, 10), 250)
  }, [searchParams])

  const [filters, setFilters] = useState<ProjectFilters>({
    region: '',
    district: '',
    sector: '',
    sale_status: '',
    construction_status: '',
    min_price: '',
    max_price: '',
  })

  const syncUrlFromFilters = useCallback(
    (nextFilters: ProjectFilters) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')

      if (nextFilters.region) params.set('region', nextFilters.region)
      else params.delete('region')

      if (nextFilters.district) params.set('community', nextFilters.district)
      else params.delete('community')

      if (nextFilters.sector) params.set('area', nextFilters.sector)
      else params.delete('area')

      if (nextFilters.sale_status) params.set('saleStatus', nextFilters.sale_status)
      else params.delete('saleStatus')

      if (nextFilters.construction_status) params.set('constructionStatus', nextFilters.construction_status)
      else params.delete('constructionStatus')

      if (nextFilters.min_price) params.set('minPrice', nextFilters.min_price)
      else params.delete('minPrice')

      if (nextFilters.max_price) params.set('maxPrice', nextFilters.max_price)
      else params.delete('maxPrice')

      params.set('page', '1')
      if (!params.get('limit')) params.set('limit', String(limit))

      router.push(`${pathname}?${params.toString()}`)
    },
    [limit, pathname, router, searchParams]
  )

  useEffect(() => {
    if (!searchParams) return

    const region = safeString(searchParams.get('region'))
    const community = safeString(searchParams.get('community'))
    const area = safeString(searchParams.get('area'))
    const saleStatus = safeString(searchParams.get('saleStatus'))
    const constructionStatus = safeString(searchParams.get('constructionStatus'))
    const minPrice = safeString(searchParams.get('minPrice'))
    const maxPrice = safeString(searchParams.get('maxPrice'))

    const next: ProjectFilters = {
      region,
      district: community,
      sector: area,
      sale_status: saleStatus === 'on_sale' || saleStatus === 'out_of_stock' ? (saleStatus as any) : '',
      construction_status:
        constructionStatus === 'completed' || constructionStatus === 'under_construction' ? (constructionStatus as any) : '',
      min_price: minPrice.replace(/[^0-9]/g, ''),
      max_price: maxPrice.replace(/[^0-9]/g, ''),
    }

    setFilters(next)
    if (hasAnyActiveFilter(next)) setHasInteracted(true)
  }, [searchParams])

  const facetProjects = useMemo(() => {
    const list = Array.isArray((facetItems as any) as unknown[]) ? (facetItems as unknown[]) : []
    return list.map((i: any) => asProject(i)).filter(Boolean) as ReellyProject[]
  }, [facetItems])

  const pageProjects = useMemo(() => {
    const list = Array.isArray((items as any) as unknown[]) ? (items as unknown[]) : []
    return list.map((i: any) => asProject(i)).filter(Boolean) as ReellyProject[]
  }, [items])

  const regionOptions = useMemo(() => {
    const set = new Set<string>()
    facetProjects.forEach((p) => {
      if (p.location?.region) set.add(p.location.region)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [facetProjects])

  const districtOptions = useMemo(() => {
    const set = new Set<string>()
    facetProjects.forEach((p) => {
      if (!filters.region || normalize(p.location.region) === normalize(filters.region)) {
        if (p.location?.district) set.add(p.location.district)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [facetProjects, filters.region])

  const sectorOptions = useMemo(() => {
    const set = new Set<string>()
    facetProjects.forEach((p) => {
      const regionOk = !filters.region || normalize(p.location.region) === normalize(filters.region)
      const districtOk = !filters.district || normalize(p.location.district) === normalize(filters.district)
      if (regionOk && districtOk) {
        if (p.location?.sector) set.add(p.location.sector)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [facetProjects, filters.district, filters.region])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = total === 0 ? 0 : (safePage - 1) * limit
  const endIndexExclusive = total === 0 ? 0 : Math.min(startIndex + pageProjects.length, total)

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
                    syncUrlFromFilters(next)
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
                    syncUrlFromFilters(next)
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
                    syncUrlFromFilters(next)
                  }}
                  options={[{ value: '', label: 'All Areas' }, ...sectorOptions.map((s) => ({ value: s }))]}
                  disabled={sectorOptions.length === 0}
                />
              </div>

              <div className="md:col-span-3">
                <SelectDropdown
                  label="Sale Status"
                  value={filters.sale_status}
                  onChange={(v) => {
                    setHasInteracted(true)
                    const next = { ...filters, sale_status: v as any }
                    setFilters(next)
                    syncUrlFromFilters(next)
                  }}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'on_sale', label: 'Available' },
                    { value: 'out_of_stock', label: 'Sold Out' },
                  ]}
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
                    syncUrlFromFilters(next)
                  }}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'under_construction', label: 'Under Construction' },
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
                  onBlur={() => syncUrlFromFilters({ ...filters })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') syncUrlFromFilters({ ...filters })
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
                  onBlur={() => syncUrlFromFilters({ ...filters })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') syncUrlFromFilters({ ...filters })
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
                      sale_status: '',
                      construction_status: '',
                      min_price: '',
                      max_price: '',
                    }
                    setFilters(next)

                    const params = new URLSearchParams(searchParams?.toString() ?? '')
                    params.delete('region')
                    params.delete('community')
                    params.delete('area')
                    params.delete('saleStatus')
                    params.delete('constructionStatus')
                    params.delete('minPrice')
                    params.delete('maxPrice')
                    params.set('page', '1')
                    if (!params.get('limit')) params.set('limit', String(limit))
                    router.push(`${pathname}?${params.toString()}`)
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
              {pageProjects.map((p) => (
                <ProjectListCard key={p.id} project={p} />
              ))}
            </div>

            <Pagination total={total} limit={limit} />
          </div>
        )}
      </div>
    </div>
  )
}
