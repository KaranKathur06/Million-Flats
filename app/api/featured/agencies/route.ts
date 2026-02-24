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

export async function GET(req: Request) {
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

  const agencyModel = (prisma as any)?.agency
  if (!agencyModel || typeof agencyModel.findMany !== 'function') {
    return NextResponse.json({ success: true, country, items: [] })
  }

  try {
    const featured = await agencyModel.findMany({
      where: { isFeatured: true, countryCode: country },
      orderBy: [{ updatedAt: 'desc' }],
      take: 24,
      select: { id: true, name: true, countryCode: true },
    })

    let pool: any[] = Array.isArray(featured) ? featured : []
    if (pool.length < take) {
      const fallback = await agencyModel.findMany({
        where: { countryCode: country },
        orderBy: [{ updatedAt: 'desc' }],
        take: 24,
        select: { id: true, name: true, countryCode: true },
      })

      const seen = new Set(pool.map((r) => String(r?.id || '')))
      for (const r of Array.isArray(fallback) ? fallback : []) {
        const id = String(r?.id || '')
        if (!id || seen.has(id)) continue
        seen.add(id)
        pool.push(r)
      }
    }

    const items = shuffle(pool)
      .slice(0, take)
      .map((a) => ({
        id: String(a?.id || ''),
        name: String(a?.name || 'Agency'),
        countryCode: a?.countryCode === 'INDIA' ? 'INDIA' : 'UAE',
      }))

    return NextResponse.json({ success: true, country, items })
  } catch (e) {
    console.error('Featured agencies: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured agencies' }, { status: 500 })
  }
}
