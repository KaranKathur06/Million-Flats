import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  country: z.enum(['UAE', 'INDIA']).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
})

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
  const take = parsed.data.limit || 4

  try {
    const where: any = {
      countryCode: country,
      status: 'ACTIVE',
      isFeatured: true,
      isDeleted: { not: true },
    }

    const runQuery = async (withDeletedFilter: boolean) =>
      (prisma as any).developer.findMany({
        where: withDeletedFilter ? where : { ...where, isDeleted: undefined },
        orderBy: [{ featuredRank: 'asc' }, { updatedAt: 'desc' }],
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          banner: true,
          shortDescription: true,
          countryCode: true,
          isFeatured: true,
        },
      })

    let items: any[] = []
    try {
      items = await runQuery(true)
    } catch {
      items = await runQuery(false)
    }

    return NextResponse.json(
      { success: true, country, items },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (e) {
    console.error('Featured developers: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured developers' }, { status: 500 })
  }
}
