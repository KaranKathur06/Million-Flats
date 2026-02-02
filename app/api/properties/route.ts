import { NextResponse } from 'next/server'
import { reellyListProjects } from '@/lib/reelly'
import { prisma } from '@/lib/prisma'

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

  const rawCountry = searchParams.get('country') || 'UAE'
  const country = rawCountry === 'India' ? 'India' : 'UAE'

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
  const purpose = searchParams.get('purpose') || undefined
  const type = searchParams.get('type') || undefined
  const city = searchParams.get('city') || undefined

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
    purpose,
  }

  try {
    const data = await reellyListProjects<any>(filters)
    const normalized = normalizeListResponse(data)

    const reellyItems = (Array.isArray(normalized.items) ? normalized.items : []).map((it: any) => ({
      ...it,
      source_type: 'REELLY',
    }))

    const parsedMin = min_price ? Number(min_price) : NaN
    const parsedMax = max_price ? Number(max_price) : NaN

    const manualWhere: any = {
      status: 'APPROVED',
      sourceType: 'MANUAL',
      countryCode: country,
    }

    if (city) manualWhere.city = { contains: city, mode: 'insensitive' }
    if (district) manualWhere.community = { contains: district, mode: 'insensitive' }
    if (type) manualWhere.propertyType = { contains: type, mode: 'insensitive' }
    if (purpose === 'rent') manualWhere.intent = 'RENT'
    if (purpose === 'buy') manualWhere.intent = 'SALE'

    if (Number.isFinite(parsedMin)) manualWhere.price = { ...(manualWhere.price || {}), gte: parsedMin }
    if (Number.isFinite(parsedMax)) manualWhere.price = { ...(manualWhere.price || {}), lte: parsedMax }

    const manualRows = await (prisma as any).manualProperty
      .findMany({
        where: manualWhere,
        orderBy: { updatedAt: 'desc' },
        include: { media: true },
        take: 120,
      })
      .catch(() => [])

    const manualItems = (manualRows as any[]).map((p) => {
      const images = Array.isArray(p?.media) ? p.media.map((m: any) => m?.url).filter(Boolean) : []
      return {
        source_type: 'MANUAL',
        id: p.id,
        title: p.title || 'Agent Listing',
        city: p.city || '',
        community: p.community || '',
        type: p.propertyType || 'Property',
        property_type: p.propertyType || 'Property',
        price: p.price || 0,
        intent: p.intent || 'SALE',
        beds: p.bedrooms || 0,
        baths: p.bathrooms || 0,
        area: p.squareFeet || 0,
        images,
        featured: Boolean(p.exclusiveDeal),
        latitude: p.latitude,
        longitude: p.longitude,
      }
    })

    const merged = [...manualItems, ...reellyItems]

    return NextResponse.json({
      items: merged,
      raw: normalized.raw,
      manualCount: manualItems.length,
      reellyCount: reellyItems.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'reelly_failed', message }, { status: 502 })
  }
}
