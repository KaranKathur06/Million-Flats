import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recomputeFeaturedScore } from '@/lib/featured/recomputeFeaturedScore'
import { recomputeAgentResponseRate } from '@/lib/featured/agentPerformance'

export const runtime = 'nodejs'

const BodySchema = z.object({
  propertyId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000).optional(),
})

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await (prisma as any).user.findUnique({ where: { email }, select: { id: true, status: true } }).catch(() => null)
    if (!dbUser?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const status = String(dbUser.status || 'ACTIVE').toUpperCase()
    if (status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const property = await (prisma as any).manualProperty
      .findUnique({ where: { id: parsed.data.propertyId }, select: { id: true, agentId: true, countryIso2: true, status: true } })
      .catch(() => null)

    if (!property?.id || !property?.agentId) {
      return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
    }

    const inquiry = await (prisma as any).inquiry.create({
      data: {
        propertyId: property.id,
        agentId: property.agentId,
        userId: dbUser.id,
        message: parsed.data.message ? safeString(parsed.data.message) : null,
        status: 'PENDING',
      },
      select: { id: true, status: true, createdAt: true },
    })

    // Event-driven performance updates
    await (prisma as any).agent
      .update({ where: { id: property.agentId }, data: { totalLeads: { increment: 1 } }, select: { id: true } })
      .catch(() => null)

    await recomputeAgentResponseRate(property.agentId).catch(() => null)
    await recomputeFeaturedScore(property.agentId).catch(() => null)

    return NextResponse.json({ success: true, inquiry })
  } catch (e) {
    console.error('Inquiry create: failed', e)
    return NextResponse.json({ success: false, message: 'Failed to create inquiry' }, { status: 500 })
  }
}
