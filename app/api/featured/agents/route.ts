import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  countryIso2: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  country: z.enum(['UAE', 'INDIA']).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
})

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

declare global {
  // eslint-disable-next-line no-var
  var __MF_FEATURED_AGENTS_CACHE__:
    | Record<
        string,
        {
          ts: number
          items: any[]
        }
      >
    | undefined
}

const CACHE_TTL_MS = 10 * 60 * 1000

function legacyCountryFromIso2(iso2: string) {
  const s = String(iso2 || '').toUpperCase()
  if (s === 'IN') return 'INDIA'
  return 'UAE'
}

function iso2FromLegacyCountry(country: string) {
  const c = String(country || '').toUpperCase()
  if (c === 'INDIA') return 'IN'
  return 'AE'
}

function cacheKey(countryIso2: string, take: number) {
  return `${countryIso2}:${take}`
}

function toAgentItem(a: any) {
  const user = a?.user
  return {
    id: safeString(a?.id),
    name: safeString(user?.name) || 'Agent',
    company: safeString(a?.company),
    profileImageUrl: safeString(a?.profileImageUrl) || safeString(a?.profilePhoto) || safeString(user?.image),
    countryIso2: safeString(a?.countryIso2),
    verificationStatus: safeString(a?.verificationStatus),
    featuredScore: typeof a?.featuredScore === 'number' ? a.featuredScore : 0,
    responseRate: typeof a?.responseRate === 'number' ? a.responseRate : 0,
    totalListings: typeof a?.totalListings === 'number' ? a.totalListings : 0,
    profileCompletion: typeof a?.profileCompletion === 'number' ? a.profileCompletion : 0,
  }
}

async function fetchFeaturedAgents(params: { countryIso2: string; take: number }) {
  const { countryIso2, take } = params

  const baseWhere = {
    approved: true,
    profileStatus: 'LIVE',
    countryIso2,
    verificationStatus: 'APPROVED',
    profileCompletion: { gt: 70 },
    totalListings: { gt: 0 },
    user: { status: 'ACTIVE' },
  }

  const primary = await (prisma as any).agent
    .findMany({
      where: baseWhere,
      include: { user: true },
      orderBy: [{ isFeaturedManual: 'desc' }, { featuredScore: 'desc' }, { responseRate: 'desc' }, { totalListings: 'desc' }],
      take,
    })
    .catch(() => [])

  const pool: any[] = Array.isArray(primary) ? primary : []
  if (pool.length >= take) return pool

  const remaining = take - pool.length
  const globalFallback = await (prisma as any).agent
    .findMany({
      where: {
        approved: true,
        profileStatus: 'LIVE',
        verificationStatus: 'APPROVED',
        profileCompletion: { gt: 70 },
        totalListings: { gt: 0 },
        user: { status: 'ACTIVE' },
      },
      include: { user: true },
      orderBy: [{ isFeaturedManual: 'desc' }, { featuredScore: 'desc' }, { responseRate: 'desc' }, { totalListings: 'desc' }],
      take: remaining + 8,
    })
    .catch(() => [])

  const seen = new Set(pool.map((r) => safeString(r?.id)))
  for (const r of Array.isArray(globalFallback) ? globalFallback : []) {
    const id = safeString(r?.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    pool.push(r)
    if (pool.length >= take) break
  }

  return pool
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const parsed = QuerySchema.safeParse({
      countryIso2: (searchParams.get('countryIso2') || '').trim() || undefined,
      country: (searchParams.get('country') || '').trim() || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query' }, { status: 400 })
    }

    const countryIso2 = parsed.data.countryIso2 || (parsed.data.country ? iso2FromLegacyCountry(parsed.data.country) : 'AE')
    const take = Math.min(24, Math.max(1, parsed.data.limit || 4))

    const key = cacheKey(countryIso2, take)
    const now = Date.now()
    const cache = global.__MF_FEATURED_AGENTS_CACHE__ || {}
    const hit = cache[key]
    if (hit?.items?.length && now - hit.ts < CACHE_TTL_MS) {
      return NextResponse.json(
        { success: true, countryIso2, country: legacyCountryFromIso2(countryIso2), items: hit.items },
        { status: 200 }
      )
    }

    const rows = await fetchFeaturedAgents({ countryIso2, take })
    const items = (Array.isArray(rows) ? rows : []).map(toAgentItem)

    global.__MF_FEATURED_AGENTS_CACHE__ = {
      ...cache,
      [key]: {
        ts: now,
        items,
      },
    }

    return NextResponse.json(
      { success: true, countryIso2, country: legacyCountryFromIso2(countryIso2), items },
      { status: 200 }
    )
  } catch (e) {
    console.error('Featured agents: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured agents' }, { status: 500 })
  }
}
