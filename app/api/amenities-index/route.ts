import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type AmenityIndexItem = {
  projectId: number
  amenities: string[]
}

type AmenityRecord = {
  id: string
  name: string
  category: string
}

type Payload = {
  generatedAt: number
  items: AmenityIndexItem[]
  amenities: string[]
  amenityIcons: Record<string, string>
  records: AmenityRecord[]
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
  const rows = await (prisma as any).projectAmenity.findMany({
    where: {
      project: { status: 'PUBLISHED', isDeleted: false },
    },
    select: { id: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const records: AmenityRecord[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const name = safeString(row.name).trim()
    if (!name) continue
    const key = normalize(name)
    if (seen.has(key)) continue
    seen.add(key)
    records.push({
      id: safeString(row.id) || key,
      name,
      category: safeString(row.category).trim() || 'Other',
    })
  }

  return {
    generatedAt: Date.now(),
    items: [],
    amenities: records.map((record) => record.name),
    amenityIcons: {},
    records,
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
