import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { PLAN_LIMITS, normalizePlan } from '@/lib/subscriptionPlans'

/**
 * GET  /api/admin/subscriptions           — list all agent subscriptions with status
 * POST /api/admin/subscriptions           — manually assign/extend a subscription
 *   body: { agentId, plan, extensionDays }
 */

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const pageSize = 25
  const skip = (page - 1) * pageSize

  const [subscriptions, total] = await Promise.all([
    prisma.agentSubscription.findMany({
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        agent: {
          select: {
            id: true,
            status: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.agentSubscription.count(),
  ])

  return NextResponse.json({ subscriptions, total, page, pageSize })
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  const body = await req.json()
  const { agentId, plan, extensionDays } = body

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const normalizedPlan = normalizePlan(plan)
  const limits = PLAN_LIMITS[normalizedPlan]

  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const existing = await prisma.agentSubscription.findUnique({ where: { agentId } })

  const now = new Date()
  // Calculate new end date
  const baseDate =
    extensionDays && existing?.endDate && existing.endDate > now
      ? existing.endDate   // extend from current expiry
      : now                // start fresh from today

  const newEndDate = new Date(baseDate)
  newEndDate.setDate(newEndDate.getDate() + (extensionDays ?? 30))

  const subscription = await prisma.agentSubscription.upsert({
    where: { agentId },
    create: {
      agentId,
      plan: normalizedPlan as any,
      status: 'ACTIVE' as any,
      startDate: now,
      endDate: newEndDate,
      listingsLimit: limits.listingLimit,
      featuredLimit: limits.featuredLimit,
      leadPriority: limits.leadPriority,
    },
    update: {
      plan: normalizedPlan as any,
      status: 'ACTIVE' as any,
      endDate: newEndDate,
      listingsLimit: limits.listingLimit,
      featuredLimit: limits.featuredLimit,
      leadPriority: limits.leadPriority,
    },
  })

  return NextResponse.json({ subscription })
}
