import { NextResponse } from 'next/server'
import { reellyFetch } from '@/lib/reelly'

type AmenityIndexItem = {
  projectId: number
  amenities: string[]
}

type Payload = {
  generatedAt: number
  items: AmenityIndexItem[]
  amenities: string[]
  amenityIcons: Record<string, string>
}

const INDEX_TTL_MS = 6 * 60 * 60 * 1000

let cached: { expiresAt: number; payload: Payload } | null = null
let inFlight: Promise<Payload> | null = null

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(v: string) {
  return v.trim().toLowerCase()
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

async function listProjectIdsUpTo(limitTotal: number) {
  const ids: number[] = []
  const batchLimit = 50
  let page = 1

  while (ids.length < limitTotal) {
    const raw = await reellyFetch<any>(
      '/api/v2/clients/projects',
      {
        limit: batchLimit,
        page,
        sale_status: 'on_sale',
      },
      { cacheTtlMs: 5 * 60 * 1000 }
    )

    const normalized = normalizeListResponse(raw)
    const items = Array.isArray(normalized.items) ? normalized.items : []
    if (items.length === 0) break

    for (const it of items) {
      if (ids.length >= limitTotal) break
      const id = safeNumber((it as any)?.id)
      if (!id) continue
      ids.push(id)
    }

    page += 1
    if (page > 200) break
  }

  return ids
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let nextIndex = 0

  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (true) {
      const idx = nextIndex
      nextIndex += 1
      if (idx >= items.length) break
      out[idx] = await fn(items[idx], idx)
    }
  })

  await Promise.all(workers)
  return out
}

async function buildAmenityIndex(): Promise<Payload> {
  const projectIds = await listProjectIdsUpTo(500)

  const nameByKey = new Map<string, string>()
  const iconByKey = new Map<string, string>()

  const rows = await mapWithConcurrency(projectIds, 10, async (projectId) => {
    try {
      const project = await reellyFetch<any>(
        `/api/v2/clients/projects/${encodeURIComponent(String(projectId))}`,
        {},
        { cacheTtlMs: 10 * 60 * 1000 }
      )

      const rawAmenities: unknown[] = Array.isArray(project?.project_amenities) ? project.project_amenities : []

      const seen = new Set<string>()
      const amenities: string[] = []

      for (const a of rawAmenities) {
        const name = safeString((a as any)?.amenity?.name)
        if (!name) continue

        const key = normalize(name)
        if (!key || seen.has(key)) continue
        seen.add(key)

        if (!nameByKey.has(key)) nameByKey.set(key, name)

        const iconUrl = safeString((a as any)?.icon?.url)
        if (iconUrl && !iconByKey.has(key)) iconByKey.set(key, iconUrl)

        amenities.push(nameByKey.get(key) ?? name)
      }

      return { projectId, amenities }
    } catch {
      return { projectId, amenities: [] }
    }
  })

  const amenitySet = new Set<string>()
  for (const r of rows) {
    for (const a of r.amenities) {
      if (a) amenitySet.add(a)
    }
  }

  const amenities = Array.from(amenitySet).sort((a, b) => a.localeCompare(b))

  const amenityIcons: Record<string, string> = {}
  for (const [key, name] of nameByKey.entries()) {
    const icon = iconByKey.get(key)
    if (icon) amenityIcons[name] = icon
  }

  return {
    generatedAt: Date.now(),
    items: rows,
    amenities,
    amenityIcons,
  }
}

export async function GET() {
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.payload)
  }

  if (!inFlight) {
    inFlight = (async () => {
      const payload = await buildAmenityIndex()
      cached = { expiresAt: Date.now() + INDEX_TTL_MS, payload }
      return payload
    })().finally(() => {
      inFlight = null
    })
  }

  try {
    const payload = await inFlight
    return NextResponse.json(payload)
  } catch (e) {
    if (cached) return NextResponse.json(cached.payload)
    const msg = e instanceof Error ? e.message : 'Failed to build amenities index.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
