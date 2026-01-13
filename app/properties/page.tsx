import { Suspense } from 'react'
import ProjectsClient from '@/app/properties/ProjectsClient'
import { reellyFetch } from '@/lib/reelly'

type SearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

function safeInt(v: string | undefined, fallback: number) {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

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

function extractTotal(raw: any, fallback: number) {
  const candidates = [
    raw?.total,
    raw?.count,
    raw?.total_count,
    raw?.totalCount,
    raw?.meta?.total,
    raw?.meta?.count,
    raw?.pagination?.total,
    raw?.pagination?.count,
    raw?.pagination?.totalCount,
  ]

  for (const c of candidates) {
    const n = typeof c === 'number' ? c : Number(c)
    if (Number.isFinite(n) && n >= 0) return n
  }

  return fallback
}

export default async function PropertiesPage({ searchParams }: { searchParams?: SearchParams }) {
  const sp = (await Promise.resolve(searchParams ?? {})) as SearchParams

  const page = Math.max(1, safeInt(first(sp.page), 1))
  const limit = Math.min(Math.max(safeInt(first(sp.limit), 50), 10), 250)

  const region = (first(sp.region) ?? '').trim()
  const community = (first(sp.community) ?? '').trim()
  const area = (first(sp.area) ?? '').trim()
  const saleStatus = (first(sp.saleStatus) ?? '').trim()
  const constructionStatus = (first(sp.constructionStatus) ?? '').trim()
  const minPrice = (first(sp.minPrice) ?? '').trim()
  const maxPrice = (first(sp.maxPrice) ?? '').trim()

  let items: unknown[] = []
  let total = 0
  let apiError = ''
  let facetItems: unknown[] = []

  try {
    const params: Record<string, unknown> = {
      limit,
      page,
      region: region || undefined,
      district: community || undefined,
      sector: area || undefined,
      sale_status: saleStatus || undefined,
      construction_status: constructionStatus || undefined,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
    }

    const raw = await reellyFetch<any>('/api/v2/clients/projects', params, { cacheTtlMs: 0 })
    const normalized = normalizeListResponse(raw)
    items = normalized.items
    total = extractTotal(normalized.raw as any, items.length)

    const facetRaw = await reellyFetch<any>('/api/v2/clients/projects', { limit: 250, page: 1 }, { cacheTtlMs: 0 })
    facetItems = normalizeListResponse(facetRaw).items
  } catch (e) {
    apiError = e instanceof Error ? e.message : 'Failed to fetch projects.'
  }

  return (
    <Suspense fallback={null}>
      <ProjectsClient items={items} total={total} apiError={apiError} facetItems={facetItems} />
    </Suspense>
  )
}

