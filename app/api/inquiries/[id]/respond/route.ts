import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { recomputeAgentResponseRate } from '@/lib/featured/agentPerformance'
import { recomputeFeaturedScore } from '@/lib/featured/recomputeFeaturedScore'

export const runtime = 'nodejs'

const BodySchema = z.object({
  status: z.literal('RESPONDED'),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const inquiry = await (prisma as any).inquiry
      .findUnique({ where: { id: params.id }, select: { id: true, agentId: true, status: true, respondedAt: true } })
      .catch(() => null)

    if (!inquiry?.id) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (String(inquiry.agentId) !== String(auth.agentId)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const currentStatus = String(inquiry.status || 'PENDING').toUpperCase()
    if (currentStatus === 'RESPONDED') {
      return NextResponse.json({ success: true, inquiry })
    }

    const updated = await (prisma as any).inquiry.update({
      where: { id: inquiry.id },
      data: { status: 'RESPONDED', respondedAt: new Date() },
      select: { id: true, status: true, respondedAt: true },
    })

    await (prisma as any).agent
      .update({ where: { id: auth.agentId }, data: { respondedLeads: { increment: 1 } }, select: { id: true } })
      .catch(() => null)

    await recomputeAgentResponseRate(auth.agentId).catch(() => null)
    await recomputeFeaturedScore(auth.agentId).catch(() => null)

    return NextResponse.json({ success: true, inquiry: updated })
  } catch (e) {
    console.error('Inquiry respond: failed', e)
    return NextResponse.json({ success: false, message: 'Failed to update inquiry' }, { status: 500 })
  }
}
