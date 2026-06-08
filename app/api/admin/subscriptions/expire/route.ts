import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

/**
 * POST /api/admin/subscriptions/expire
 * 
 * Cron endpoint to expire subscriptions that have passed their end date.
 * This should be called daily via a cron job or scheduled task.
 * 
 * Security: Requires admin authentication
 */
export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  try {
    const now = new Date()

    // Update all expired subscriptions
    const result = await (prisma as any).agentSubscription.updateMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    return NextResponse.json({
      success: true,
      expiredCount: result.count,
      message: `Expired ${result.count} subscription(s)`,
    })
  } catch (error) {
    console.error('Subscription expiry error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to expire subscriptions' },
      { status: 500 }
    )
  }
}
