import { NextResponse } from 'next/server'
import { z } from 'zod'
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

const QuerySchema = z.object({
  purpose: z.enum(['rent', 'buy']).optional(),
  country: z.enum(['UAE', 'India']).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  propertyType: z.string().trim().min(1).max(80).optional(),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional(),
})

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
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

  try {
    const { searchParams } = new URL(req.url)

    const parsed = QuerySchema.safeParse({
      purpose: (searchParams.get('purpose') || '').toLowerCase() || undefined,
      country: (searchParams.get('country') || '').trim() || undefined,
      city: searchParams.get('city') || undefined,
      propertyType: searchParams.get('propertyType') || searchParams.get('type') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid filters' }, { status: 400 })
    }

    const q = parsed.data
    const where: any = {
      status: 'APPROVED',
      sourceType: 'MANUAL',
      agent: {
        approved: true,
        user: { status: 'ACTIVE' },
      },
    }

    if (q.country) where.countryCode = q.country
    if (q.city) where.city = { contains: q.city, mode: 'insensitive' }
    if (q.propertyType) where.propertyType = { contains: q.propertyType, mode: 'insensitive' }
    if (q.purpose === 'rent') where.intent = 'RENT'
    if (q.purpose === 'buy') where.intent = 'SALE'

    if (typeof q.minPrice === 'number' && Number.isFinite(q.minPrice)) {
      where.price = { ...(where.price || {}), gte: q.minPrice }
    }
    if (typeof q.maxPrice === 'number' && Number.isFinite(q.maxPrice)) {
      where.price = { ...(where.price || {}), lte: q.maxPrice }
    }

    const rows = await (prisma as any).manualProperty.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { media: true, agent: { include: { user: true } } },
      take: 200,
    })

    const items = (rows as any[]).map((p) => {
      const images: string[] = Array.isArray(p?.media)
        ? p.media
            .filter((m: any) => {
              const cat = safeString(m?.category)
              return cat !== 'BROCHURE' && cat !== 'VIDEO'
            })
            .map((m: any) => safeString(m?.url))
            .filter(Boolean)
        : []

      const agentUser = p?.agent?.user

      return {
        id: String(p.id),
        title: safeString(p.title) || 'Agent Listing',
        price: typeof p.price === 'number' ? p.price : safeNumber(p.price),
        currency: safeString(p.currency) || 'AED',
        country: p.countryCode === 'India' ? 'India' : 'UAE',
        city: safeString(p.city),
        community: safeString(p.community),
        propertyType: safeString(p.propertyType) || 'Property',
        intent: p.intent === 'RENT' ? 'RENT' : 'BUY',
        bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : safeNumber(p.bedrooms),
        bathrooms: typeof p.bathrooms === 'number' ? p.bathrooms : safeNumber(p.bathrooms),
        squareFeet: typeof p.squareFeet === 'number' ? p.squareFeet : safeNumber(p.squareFeet),
        images,
        featured: Boolean(p.exclusiveDeal),
        sourceType: 'MANUAL',
        agent: agentUser
          ? {
              id: safeString(p.agentId),
              name: safeString(agentUser?.name),
              email: safeString(agentUser?.email),
              phone: safeString(agentUser?.phone),
              avatar: safeString(agentUser?.image),
            }
          : undefined,
      }
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    console.error('Properties feed: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load properties. Please try again later.' }, { status: 500 })
  }
}
