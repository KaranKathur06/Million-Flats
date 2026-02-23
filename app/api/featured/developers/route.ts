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
  const take = typeof parsed.data.limit === 'number' ? parsed.data.limit : 6

  try {
    const rows = await (prisma as any).developer.findMany({
      where: { isFeatured: true, countryCode: country },
      orderBy: [{ updatedAt: 'desc' }],
      take,
      select: {
        id: true,
        name: true,
        countryCode: true,
      },
    })

    const items = (rows as any[]).map((d) => ({
      id: String(d?.id || ''),
      name: String(d?.name || 'Developer'),
      countryCode: d?.countryCode === 'INDIA' ? 'INDIA' : 'UAE',
    }))

    return NextResponse.json({ success: true, country, items })
  } catch (e) {
    console.error('Featured developers: failed', e)
    return NextResponse.json({ success: false, message: 'Unable to load featured developers' }, { status: 500 })
  }
}
