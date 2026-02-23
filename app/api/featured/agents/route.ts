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
    const take = typeof parsed.data.limit === 'number' ? parsed.data.limit : 8

    const agents = await (prisma as any).agent.findMany({
      where: { approved: true, profileStatus: 'LIVE', isFeatured: true, countryCode: country, user: { status: 'ACTIVE' } },
      include: { user: true },
      orderBy: [{ updatedAt: 'desc' }],
      take,
    })

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
