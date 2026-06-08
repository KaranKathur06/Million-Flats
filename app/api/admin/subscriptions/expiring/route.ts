import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

/**
 * GET /api/admin/subscriptions/expiring
 * 
 * Get subscriptions expiring within a threshold (default 7 days).
 * Used for sending expiry notifications via cron job.
 * 
 * Query params:
 *   - daysThreshold: Number of days threshold (default 7)
 * 
 * Security: Requires admin authentication
 */
export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  try {
    const url = new URL(req.url)
    const daysThreshold = parseInt(url.searchParams.get('daysThreshold') || '7')
    const now = new Date()
    const threshold = new Date(now)
    threshold.setDate(threshold.getDate() + daysThreshold)

    const subscriptions = await (prisma as any).agentSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: {
          gte: now,
          lte: threshold,
        },
      },
      include: {
        agent: {
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
      orderBy: { endDate: 'asc' },
    })

    const expiring = subscriptions.map((sub: any) => {
      const endDate = new Date(sub.endDate)
      const diff = endDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))

      return {
        agentId: sub.agentId,
        email: sub.agent.user.email,
        name: sub.agent.user.name,
        plan: sub.plan,
        status: sub.status,
        endDate: sub.endDate,
        daysRemaining,
      }
    })

    return NextResponse.json({
      success: true,
      expiring,
      count: expiring.length,
      thresholdDays: daysThreshold,
    })
  } catch (error) {
    console.error('Get expiring subscriptions error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get expiring subscriptions' },
      { status: 500 }
    )
  }
}
