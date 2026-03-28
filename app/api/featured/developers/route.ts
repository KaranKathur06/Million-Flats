import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

  try {
    const getFeatured = async (withDeletedFilter: boolean) =>
      prisma.$queryRaw<Array<{ id: string; name: string; country: string | null }>>`
        SELECT id, name, country
        FROM developers
        WHERE is_featured = true
          AND country = ${country}::"CountryCode"
          AND status = 'ACTIVE'
          ${withDeletedFilter ? Prisma.sql`AND COALESCE(is_deleted, false) = false` : Prisma.empty}
        ORDER BY updated_at DESC
        LIMIT 24
      `

    let featured: Array<{ id: string; name: string; country: string | null }>
    try {
      featured = await getFeatured(true)
    } catch {
      featured = await getFeatured(false)
    }

    let pool: any[] = Array.isArray(featured) ? featured : []
    if (pool.length < take) {
      const getFallback = async (withDeletedFilter: boolean) =>
        prisma.$queryRaw<Array<{ id: string; name: string; country: string | null }>>`
          SELECT id, name, country
          FROM developers
          WHERE country = ${country}::"CountryCode"
            AND status = 'ACTIVE'
            ${withDeletedFilter ? Prisma.sql`AND COALESCE(is_deleted, false) = false` : Prisma.empty}
          ORDER BY updated_at DESC
          LIMIT 24
        `

      let fallback: Array<{ id: string; name: string; country: string | null }>
      try {
        fallback = await getFallback(true)
      } catch {
        fallback = await getFallback(false)
      }

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
      .map((d) => ({
        id: String(d?.id || ''),
        name: String(d?.name || 'Developer'),
        countryCode: String(d?.country || '').toUpperCase() === 'INDIA' ? 'INDIA' : 'UAE',
      }))

    return NextResponse.json(
      { success: true, country, items },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (e) {
    console.error('Featured developers: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured developers' }, { status: 500 })
  }
}
