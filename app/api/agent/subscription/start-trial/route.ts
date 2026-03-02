import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'

export const runtime = 'nodejs'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

function addDays(d: Date, days: number) {
  const out = new Date(d.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

export async function POST() {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return bad(auth.message, auth.status)
  }

  const now = new Date()
  const trialEndsAt = addDays(now, 14)

  const sub = await (prisma as any).agentSubscription
    .upsert({
      where: { agentId: auth.agentId },
      create: {
        agentId: auth.agentId,
        plan: 'PROFESSIONAL',
        status: 'TRIAL',
        startDate: now,
        trialEndsAt,
        endDate: trialEndsAt,
        listingsLimit: 50,
        leadLimit: 500,
        verixAccessLevel: 2,
      },
      update: {
        // idempotent: do not extend trial if it already exists
      },
      select: {
        id: true,
        plan: true,
        status: true,
        startDate: true,
        endDate: true,
        trialEndsAt: true,
        cancelledAt: true,
        listingsLimit: true,
        leadLimit: true,
        verixAccessLevel: true,
      },
    })
    .catch((e: any) => {
      console.error('Start trial failed', e)
      return null
    })

  if (!sub?.id) {
    return bad('Failed to start trial', 500)
  }

  return NextResponse.json({ success: true, subscription: sub })
}
