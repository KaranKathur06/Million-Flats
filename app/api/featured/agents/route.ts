import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  country: z.enum(['UAE', 'INDIA']).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
})

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

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
      approved: true,
      profileStatus: 'LIVE',
      countryCode: country,
      user: { status: 'ACTIVE' },
    }

    const featured = await (prisma as any).agent.findMany({
      where: { ...baseWhere, isFeatured: true },
      include: { user: true },
      orderBy: [{ updatedAt: 'desc' }],
      take: 24,
    })

    let pool: any[] = Array.isArray(featured) ? featured : []
    if (pool.length < take) {
      const fallback = await (prisma as any).agent.findMany({
        where: baseWhere,
        include: { user: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 24,
      })

      const seen = new Set(pool.map((r) => safeString(r?.id)))
      for (const r of Array.isArray(fallback) ? fallback : []) {
        const id = safeString(r?.id)
        if (!id || seen.has(id)) continue
        seen.add(id)
        pool.push(r)
      }
    }

    const agents = shuffle(pool).slice(0, take)

    const items = (agents as any[]).map((a) => {
      const user = a?.user
      return {
        id: safeString(a?.id),
        name: safeString(user?.name) || 'Agent',
        company: safeString(a?.company),
        profileImageUrl: safeString(a?.profileImageUrl) || safeString(a?.profilePhoto) || safeString(user?.image),
      }
    })

    return NextResponse.json({ success: true, country, items })
  } catch (e) {
    console.error('Featured agents: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured agents' }, { status: 500 })
  }
}
