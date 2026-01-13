import { NextResponse } from 'next/server'
import { reellyListProjects } from '@/lib/reelly'

type RateEntry = { count: number; resetAt: number }

const rate = new Map<string, RateEntry>()

function getClientIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

function rateLimit(ip: string) {
  const now = Date.now()
  const windowMs = 60 * 1000
  const max = 60

  const cur = rate.get(ip)
  if (!cur || cur.resetAt <= now) {
    rate.set(ip, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (cur.count >= max) {
    return { ok: false, retryAfterSeconds: Math.ceil((cur.resetAt - now) / 1000) }
  }

  cur.count += 1
  return { ok: true }
}

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [], raw }

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

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 60) } }
    )
  }

  const { searchParams } = new URL(req.url)

  const rawLimit = searchParams.get('limit')
  const rawPage = searchParams.get('page')
  const rawOffset = searchParams.get('offset')

  const region = searchParams.get('region') || undefined
  const district = searchParams.get('community') || undefined
  const sector = searchParams.get('area') || undefined
  const sale_status = searchParams.get('saleStatus') || undefined
  const construction_status = searchParams.get('constructionStatus') || undefined
  const min_price = searchParams.get('minPrice') || undefined
  const max_price = searchParams.get('maxPrice') || undefined

  const parsedLimit = rawLimit ? Number(rawLimit) : NaN
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? String(Math.min(parsedLimit, 250)) : '50'

  const parsedPage = rawPage ? Number(rawPage) : NaN
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? String(parsedPage) : undefined

  const parsedOffset = rawOffset ? Number(rawOffset) : NaN
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? String(parsedOffset) : undefined

  const filters = {
    limit,
    page,
    offset,
    region,
    district,
    sector,
    sale_status,
    construction_status,
    min_price,
    max_price,
  }

  try {
    const data = await reellyListProjects<any>(filters)
    const normalized = normalizeListResponse(data)
    console.log('Projects fetched:', Array.isArray(normalized.items) ? normalized.items.length : 0)
    return NextResponse.json(normalized)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'reelly_failed', message }, { status: 502 })
  }
}
