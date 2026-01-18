import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { reellyFetch } from '@/lib/reelly'
import { buildProjectSeoPath } from '@/lib/seo'

type SeedCacheEntry = {
  expiresAt: number
  seedItems: unknown[]
  apiError: string
}

const SEED_TTL_MS = 5 * 60 * 1000

function siteUrl() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

function absoluteUrl(path: string) {
  const base = siteUrl()
  if (!base) return ''
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function toImageUrl(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const u = (v as any).url
    if (typeof u === 'string') return u
  }
  return ''
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

function canOptimizeUrl(src: string) {
  if (typeof src !== 'string') return false
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

function safeInt(v: string | undefined, fallback: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function safeQueryString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function getParam(searchParams: Record<string, string | string[] | undefined> | undefined, key: string) {
  const v = searchParams?.[key]
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : ''
  return ''
}

function buildQueryString(params: Record<string, string>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue
    sp.set(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function formatAed(amount: number) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount)
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl('/properties')
  return {
    title: 'Properties for Sale in UAE | millionflats',
    description:
      'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details with SEO-ready listings.',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: 'Properties for Sale in UAE | millionflats',
      description:
        'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details.',
      url: canonical || undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Properties for Sale in UAE | millionflats',
      description:
        'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details.',
    },
  }
}

let seedCache: SeedCacheEntry | null = null
let seedInFlight: Promise<{ seedItems: unknown[]; apiError: string }> | null = null

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [] as unknown[], raw }

  const anyRaw = raw as any
  const items =
    Array.isArray(anyRaw.items)
      ? anyRaw.items
      : Array.isArray(anyRaw.results)
        ? anyRaw.results
        : Array.isArray(anyRaw.data)
          ? anyRaw.data
          : Array.isArray(anyRaw)
            ? anyRaw
            : []

  return { items, raw }
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const target = 500
  const batchLimit = 50

  const now = Date.now()

  if (!seedInFlight) {
    seedInFlight = (async () => {
      let seedItems: unknown[] = []
      let apiError = ''

      try {
        let page = 1
        while (seedItems.length < target) {
          const raw = await reellyFetch<any>(
            '/api/v2/clients/projects',
            {
              limit: batchLimit,
              page,
              sale_status: 'on_sale',
            },
            { cacheTtlMs: SEED_TTL_MS }
          )

          const normalized = normalizeListResponse(raw)
          const items = Array.isArray(normalized.items) ? normalized.items : []
          if (items.length === 0) break

          for (const it of items) {
            if (seedItems.length >= target) break
            const status = (it as any)?.sale_status
            if (status === 'on_sale') seedItems.push(it)
          }

          page += 1
          if (page > 200) break
        }
      } catch (e) {
        apiError = e instanceof Error ? e.message : 'Failed to fetch projects.'
      }

      seedCache = {
        expiresAt: Date.now() + SEED_TTL_MS,
        seedItems,
        apiError,
      }

      return { seedItems, apiError }
    })().finally(() => {
      seedInFlight = null
    })
  }

  const { seedItems, apiError } = seedCache && seedCache.expiresAt > now ? seedCache : await seedInFlight

  const allItems = Array.isArray(seedItems) ? seedItems : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">Properties</h1>
        <p className="mt-2 text-gray-600">Explore projects and properties across the UAE.</p>

        {apiError ? (
          <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="font-semibold text-dark-blue">Projects are unavailable right now.</p>
            <p className="mt-2 text-sm text-gray-600">{apiError}</p>
          </div>
        ) : null}

        {(() => {
          const regionQ = safeQueryString(getParam(searchParams, 'region'))
          const districtQ = safeQueryString(getParam(searchParams, 'community'))
          const sectorQ = safeQueryString(getParam(searchParams, 'area'))
          const constructionQ = safeQueryString(getParam(searchParams, 'constructionStatus'))
          const developerQ = safeQueryString(getParam(searchParams, 'developer'))
          const minPriceQ = safeQueryString(getParam(searchParams, 'minPrice')).replace(/[^0-9]/g, '')
          const maxPriceQ = safeQueryString(getParam(searchParams, 'maxPrice')).replace(/[^0-9]/g, '')
          const pageQ = safeQueryString(getParam(searchParams, 'page'))

          const page = safeInt(pageQ, 1)
          const pageSize = 24

          const projects = allItems
            .map((it: any) => {
              const id = safeNumber(it?.id)
              if (!id) return null
              const name = safeString(it?.name) || safeString(it?.title)
              const developer = safeString(it?.developer)
              const sale_status = it?.sale_status
              const construction_status = it?.construction_status
              const location = it?.location
              const region = safeString(location?.region)
              const district = safeString(location?.district)
              const sector = safeString(location?.sector)
              if (!name || !developer || !region || !district || !sector) return null
              if (sale_status !== 'on_sale') return null
              if (construction_status !== 'completed' && construction_status !== 'under_construction') return null
              const min_price = safeNumber(it?.min_price)
              const cover = toImageUrl(it?.cover_image) || '/image-placeholder.svg'

              return {
                id,
                name,
                developer,
                construction_status,
                min_price,
                region,
                district,
                sector,
                cover,
              }
            })
            .filter(Boolean) as Array<{
            id: number
            name: string
            developer: string
            construction_status: string
            min_price: number
            region: string
            district: string
            sector: string
            cover: string
          }>

          const regionOptions = Array.from(new Set(projects.map((p) => p.region))).sort((a, b) => a.localeCompare(b))
          const districtOptions = Array.from(
            new Set(projects.filter((p) => (!regionQ ? true : normalize(p.region) === normalize(regionQ))).map((p) => p.district))
          ).sort((a, b) => a.localeCompare(b))
          const sectorOptions = Array.from(
            new Set(
              projects
                .filter((p) => (!regionQ ? true : normalize(p.region) === normalize(regionQ)))
                .filter((p) => (!districtQ ? true : normalize(p.district) === normalize(districtQ)))
                .map((p) => p.sector)
            )
          ).sort((a, b) => a.localeCompare(b))
          const developerOptions = Array.from(new Set(projects.map((p) => p.developer))).sort((a, b) => a.localeCompare(b))

          const minN = minPriceQ ? Number(minPriceQ) : undefined
          const maxN = maxPriceQ ? Number(maxPriceQ) : undefined

          let filtered = projects
          if (regionQ) filtered = filtered.filter((p) => normalize(p.region) === normalize(regionQ))
          if (districtQ) filtered = filtered.filter((p) => normalize(p.district) === normalize(districtQ))
          if (sectorQ) filtered = filtered.filter((p) => normalize(p.sector) === normalize(sectorQ))
          if (developerQ) filtered = filtered.filter((p) => normalize(p.developer) === normalize(developerQ))
          if (constructionQ) filtered = filtered.filter((p) => p.construction_status === constructionQ)
          if (minN != null && Number.isFinite(minN)) filtered = filtered.filter((p) => p.min_price <= 0 || p.min_price >= minN)
          if (maxN != null && Number.isFinite(maxN)) filtered = filtered.filter((p) => p.min_price <= 0 || p.min_price <= maxN)

          const total = filtered.length
          const totalPages = Math.max(1, Math.ceil(total / pageSize))
          const currentPage = Math.min(page, totalPages)
          const start = (currentPage - 1) * pageSize
          const visible = filtered.slice(start, start + pageSize)

          const queryBase = {
            region: regionQ,
            community: districtQ,
            area: sectorQ,
            constructionStatus: constructionQ,
            developer: developerQ,
            minPrice: minPriceQ,
            maxPrice: maxPriceQ,
          }

          const prevHref = currentPage > 1 ? `/properties${buildQueryString({ ...queryBase, page: String(currentPage - 1) })}` : ''
          const nextHref = currentPage < totalPages ? `/properties${buildQueryString({ ...queryBase, page: String(currentPage + 1) })}` : ''

          const resetHref = '/properties'

          return (
            <>
              <form method="get" className="mt-8 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
                    <select name="region" defaultValue={regionQ} className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white">
                      <option value="">All Regions</option>
                      {regionOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Community</label>
                    <select
                      name="community"
                      defaultValue={districtQ}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">All Communities</option>
                      {districtOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Area</label>
                    <select name="area" defaultValue={sectorQ} className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white">
                      <option value="">All Areas</option>
                      {sectorOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Developer</label>
                    <select
                      name="developer"
                      defaultValue={developerQ}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">All Developers</option>
                      {developerOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Construction</label>
                    <select
                      name="constructionStatus"
                      defaultValue={constructionQ}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">Any</option>
                      <option value="completed">Completed</option>
                      <option value="under_construction">Under Construction</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Min Price (AED)</label>
                    <input
                      name="minPrice"
                      defaultValue={minPriceQ}
                      inputMode="numeric"
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
                      placeholder="e.g. 500000"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price (AED)</label>
                    <input
                      name="maxPrice"
                      defaultValue={maxPriceQ}
                      inputMode="numeric"
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
                      placeholder="e.g. 2000000"
                    />
                  </div>
                  <div className="md:col-span-3 flex items-end gap-3">
                    <button type="submit" className="h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold">
                      Apply
                    </button>
                    <Link href={resetHref} className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold inline-flex items-center">
                      Reset
                    </Link>
                  </div>
                </div>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
                <p>
                  {total === 0
                    ? '0 projects'
                    : `Showing ${start + 1}–${Math.min(start + visible.length, total)} of ${total} projects`}
                </p>
                <div className="flex items-center gap-2">
                  {prevHref ? (
                    <Link href={prevHref} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold inline-flex items-center">
                      Prev
                    </Link>
                  ) : (
                    <span className="h-10 px-4 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 font-semibold inline-flex items-center">
                      Prev
                    </span>
                  )}
                  <span className="px-2">Page {currentPage} / {totalPages}</span>
                  {nextHref ? (
                    <Link href={nextHref} className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold inline-flex items-center">
                      Next
                    </Link>
                  ) : (
                    <span className="h-10 px-4 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 font-semibold inline-flex items-center">
                      Next
                    </span>
                  )}
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="mt-10 text-center text-gray-600">No projects match your filters.</div>
              ) : (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visible.map((p) => {
                    const href =
                      buildProjectSeoPath({
                        id: p.id,
                        name: p.name,
                        region: p.region,
                        district: p.district,
                        sector: p.sector,
                      }) || `/properties/${p.id}`

                    const unoptimized = p.cover.startsWith('http') && !canOptimizeUrl(p.cover)

                    const locationLabel = [p.sector, p.district, p.region].filter(Boolean).join(', ')

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <Link href={href} className="block">
                          <div className="relative aspect-[16/9]">
                            <Image
                              src={p.cover}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              unoptimized={unoptimized}
                            />
                          </div>
                        </Link>
                        <div className="p-5">
                          <p className="text-lg font-semibold text-dark-blue truncate">{p.name}</p>
                          <p className="mt-1 text-sm text-gray-600 truncate">{p.developer}</p>
                          <p className="mt-2 text-sm text-gray-600">{locationLabel}</p>
                          <p className="mt-3 text-base font-bold text-dark-blue">
                            {p.min_price > 0 ? `From ${formatAed(p.min_price)}` : 'Price on request'}
                          </p>
                          <Link
                            href={href}
                            className="mt-4 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

