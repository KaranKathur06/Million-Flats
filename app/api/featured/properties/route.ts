import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  country: z.enum(['UAE', 'INDIA']).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
})

function shuffle<T>(input: T[]) {
  const arr = input.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const parsed = QuerySchema.safeParse({
      country: (searchParams.get('country') || '').trim() || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query' }, { status: 400 })
    }

    const country = parsed.data.country || 'UAE'
    const take = 4

    const baseWhere = {
      status: 'APPROVED',
      sourceType: 'MANUAL',
      countryCode: country,
      agent: {
        approved: true,
        profileStatus: 'LIVE',
        user: { status: 'ACTIVE' },
      },
    }

    const primary = await (prisma as any).manualProperty.findMany({
      where: {
        ...baseWhere,
        exclusiveDeal: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: { media: true },
      take: 40,
    })

    let pool: any[] = Array.isArray(primary) ? primary : []
    if (pool.length < take) {
      const fallback = await (prisma as any).manualProperty.findMany({
        where: baseWhere,
        orderBy: [{ updatedAt: 'desc' }],
        include: { media: true },
        take: 40,
      })

      const seen = new Set(pool.map((r) => String(r?.id || '')))
      for (const r of Array.isArray(fallback) ? fallback : []) {
        const id = String(r?.id || '')
        if (!id || seen.has(id)) continue
        seen.add(id)
        pool.push(r)
      }
    }

    const rows = shuffle(pool).slice(0, take)

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

      return {
        id: String(p.id),
        title: safeString(p.title) || 'Featured Property',
        price: typeof p.price === 'number' ? p.price : safeNumber(p.price),
        country: p.countryCode === 'INDIA' ? 'INDIA' : 'UAE',
        city: safeString(p.city),
        community: safeString(p.community),
        propertyType: safeString(p.propertyType) || 'Property',
        intent: p.intent === 'RENT' ? 'RENT' : 'BUY',
        bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : safeNumber(p.bedrooms),
        bathrooms: typeof p.bathrooms === 'number' ? p.bathrooms : safeNumber(p.bathrooms),
        squareFeet: typeof p.squareFeet === 'number' ? p.squareFeet : safeNumber(p.squareFeet),
        images,
      }
    })

    return NextResponse.json({ success: true, country, items })
  } catch (e) {
    console.error('Featured properties: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured properties' }, { status: 500 })
  }
}
