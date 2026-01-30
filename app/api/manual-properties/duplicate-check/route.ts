import { NextResponse } from 'next/server'
import { z } from 'zod'
import { reellyFetch, reellyGetProject } from '@/lib/reelly'

const InputSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  community: z.string().trim().min(1).max(160).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  developerName: z.string().trim().min(1).max(160).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  price: z.number().positive().optional(),
})

type Marker = {
  id: string
  name: string
  lat: number
  lng: number
}

type CacheEntry = { expiresAt: number; markers: Marker[] }
let markerCache: CacheEntry | null = null
let markerInFlight: Promise<Marker[]> | null = null

const MARKERS_TTL_MS = 10 * 60 * 1000

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function tokenSimilarity(a: string, b: string) {
  const aa = normalize(a)
  const bb = normalize(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 100

  const at = new Set(aa.split(' ').filter(Boolean))
  const bt = new Set(bb.split(' ').filter(Boolean))
  if (at.size === 0 || bt.size === 0) return 0

  let inter = 0
  for (const t of at) if (bt.has(t)) inter += 1
  return Math.round((2 * inter * 100) / (at.size + bt.size))
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const sLat1 = toRad(aLat)
  const sLat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(sLat1) * Math.cos(sLat2)
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

function geoScore(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0
  if (distanceMeters <= 300) return 100
  if (distanceMeters <= 1000) return 70
  if (distanceMeters <= 3000) return 40
  return 0
}

async function getMarkers(): Promise<Marker[]> {
  const now = Date.now()
  if (markerCache && markerCache.expiresAt > now) return markerCache.markers

  if (!markerInFlight) {
    markerInFlight = (async () => {
      const raw = await reellyFetch<any>('/api/v2/clients/projects/markers', {}, { cacheTtlMs: MARKERS_TTL_MS })
      const items: unknown[] = Array.isArray((raw as any)?.items)
        ? (raw as any).items
        : Array.isArray((raw as any)?.results)
          ? (raw as any).results
          : Array.isArray(raw)
            ? raw
            : []

      const markers: Marker[] = []
      for (const it of items) {
        const id = safeString((it as any)?.id) || String(safeNumber((it as any)?.id))
        const name = safeString((it as any)?.name) || safeString((it as any)?.title) || ''
        const lat = safeNumber((it as any)?.lat ?? (it as any)?.latitude)
        const lng = safeNumber((it as any)?.lng ?? (it as any)?.longitude)
        if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
        markers.push({ id, name, lat, lng })
      }

      markerCache = { expiresAt: Date.now() + MARKERS_TTL_MS, markers }
      return markers
    })().finally(() => {
      markerInFlight = null
    })
  }

  return markerInFlight
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = InputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  const { title = '', community = '', city = '', developerName = '', latitude, longitude, price } = parsed.data

  const markers = await getMarkers().catch(() => [])

  const hasGeo = typeof latitude === 'number' && typeof longitude === 'number'
  const baseName = title

  let candidates = markers
  if (hasGeo) {
    candidates = markers
      .map((m) => ({
        m,
        d: haversineMeters(latitude as number, longitude as number, m.lat, m.lng),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 40)
      .map((x) => x.m)
  } else if (baseName) {
    candidates = markers
      .map((m) => ({ m, s: tokenSimilarity(baseName, m.name) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.m)
  } else {
    candidates = markers.slice(0, 40)
  }

  let best: { projectId: string; score: number; name: string; developer: string; distanceMeters?: number; url?: string } | null = null

  for (const c of candidates) {
    const nameSim = baseName ? tokenSimilarity(baseName, c.name) : 0

    const dist = hasGeo ? haversineMeters(latitude as number, longitude as number, c.lat, c.lng) : NaN
    const gScore = hasGeo ? geoScore(dist) : 0

    let devSim = 0
    let priceScore = 0
    let area = 0

    if (nameSim >= 45 || gScore >= 70) {
      try {
        const project = await reellyGetProject<any>(String(c.id))
        const dev = safeString(project?.developer?.name) || safeString(project?.developer_name) || ''
        const projectCommunity =
          safeString(project?.location?.district) || safeString(project?.location?.community) || safeString(project?.location?.sector) || ''

        devSim = developerName && dev ? tokenSimilarity(developerName, dev) : 0

        const p = safeNumber(project?.min_price ?? project?.price ?? 0)
        if (price && p) {
          const ratio = Math.min(price, p) / Math.max(price, p)
          priceScore = ratio >= 0.9 ? 100 : ratio >= 0.8 ? 70 : ratio >= 0.7 ? 40 : 0
        }

        area = community && projectCommunity ? tokenSimilarity(community, projectCommunity) : 0

        const score = Math.round(nameSim * 0.4 + area * 0.25 + devSim * 0.15 + gScore * 0.15 + priceScore * 0.05)

        if (!best || score > best.score) {
          best = {
            projectId: String(c.id),
            score,
            name: safeString(project?.name) || c.name,
            developer: dev,
            distanceMeters: hasGeo ? dist : undefined,
            url: `/properties/${encodeURIComponent(String(c.id))}`,
          }
        }
      } catch {
        const score = Math.round(nameSim * 0.6 + gScore * 0.4)
        if (!best || score > best.score) {
          best = {
            projectId: String(c.id),
            score,
            name: c.name,
            developer: '',
            distanceMeters: hasGeo ? dist : undefined,
            url: `/properties/${encodeURIComponent(String(c.id))}`,
          }
        }
      }
    }
  }

  const score = best?.score ?? 0
  const level = score >= 75 ? 'strong' : score >= 50 ? 'soft' : 'none'

  return NextResponse.json({
    success: true,
    result: {
      score,
      level,
      match: best,
    },
  })
}
