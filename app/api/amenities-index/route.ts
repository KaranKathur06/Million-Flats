import { NextResponse } from 'next/server'

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
  void limitTotal
  return [] as number[]
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
  return {
    generatedAt: Date.now(),
    items: [],
    amenities: [],
    amenityIcons: {},
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
