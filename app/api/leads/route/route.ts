import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLeadRoutingScore } from '@/lib/subscriptionPlans'

/**
 * POST /api/leads/route
 * 
 * Lead distribution engine. Assigns an incoming inquiry to the best available agent.
 * 
 * Priority order:
 * 1. The property's owning agent (if they exist and are APPROVED)
 * 2. PREMIUM agents → PROFESSIONAL → BASIC (by score, rating, response time, location match)
 */

export async function POST(req: Request) {
  const body = await req.json()
  const { propertyId, name, email, phone, message, userId } = body

  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
  }

  // 1. Find property and its owner agent
  const property: any = await (prisma as any).manualProperty.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      agentId: true,
      agent: {
        select: {
          id: true,
          status: true,
          subscription: {
            select: { plan: true, status: true },
          },
        },
      },
    },
  })

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  let assignedAgentId: string | null = null

  // 2. Prefer property owner if APPROVED
  if (property.agent?.status === 'APPROVED') {
    assignedAgentId = property.agent.id
  } else {
    // 3. Fallback: route by subscription tier + rating + response rate
    const candidates: any[] = await (prisma as any).agent.findMany({
      where: {
        status: 'APPROVED' as any,
        subscription: {
          status: { in: ['ACTIVE', 'TRIAL'] as any[] },
        },
      },
      select: {
        id: true,
        responseRate: true,
        subscription: {
          select: { plan: true, status: true },
        },
      },
    })

    // Score each candidate
    const scored = candidates
      .map((agent: any) => {
        const plan = (agent.subscription?.plan ?? 'BASIC') as any
        const subStatus = (agent.subscription?.status ?? 'ACTIVE') as any
        const baseScore = getLeadRoutingScore(plan, subStatus)
        // Blend in response rate (0–1 scale, up to +20 bonus)
        const responseBonus = (agent.responseRate ?? 0) * 20
        return { agentId: agent.id, score: baseScore + responseBonus }
      })
      .sort((a, b) => b.score - a.score)

    assignedAgentId = scored[0]?.agentId ?? null
  }

  if (!assignedAgentId) {
    return NextResponse.json({ error: 'No eligible agent found to route lead' }, { status: 422 })
  }

  // 4. Create the Inquiry record
  const inquiry = await (prisma as any).inquiry.create({
    data: {
      propertyId,
      agentId: assignedAgentId,
      userId: userId ?? null,
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      message: message ?? null,
      status: 'NEW' as any,
    },
  })

  // 5. Increment agent lead counter
  await (prisma as any).agent.update({
    where: { id: assignedAgentId },
    data: { totalLeads: { increment: 1 } },
  })

  return NextResponse.json({ inquiry, assignedAgentId }, { status: 201 })
}
