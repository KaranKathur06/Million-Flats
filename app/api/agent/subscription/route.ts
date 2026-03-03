import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function GET() {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return bad(auth.message, auth.status)
  }

  const sub = await (prisma as any).agentSubscription
    .findUnique({
      where: { agentId: auth.agentId },
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
        provider: true,
        providerSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch(() => null)

  return NextResponse.json({ success: true, subscription: sub })
}
