import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/system/subscription-expiry-check
 *
 * Cron-safe endpoint to downgrade expired subscriptions to BASIC plan.
 * Should be called by a scheduled job (e.g. Vercel Cron, GitHub Actions, or any cron runner).
 *
 * Secured by a secret token in the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 */

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all active/trial subscriptions that have passed their endDate
  const expired = await prisma.agentSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] as any[] },
      endDate: { lte: now },
    },
    select: { id: true, agentId: true, plan: true },
  })

  if (expired.length === 0) {
    return NextResponse.json({ downgraded: 0, message: 'No expired subscriptions found.' })
  }

  // Downgrade each to BASIC + mark as EXPIRED
  const updates = await Promise.all(
    expired.map((sub) =>
      prisma.agentSubscription.update({
        where: { id: sub.id },
        data: {
          status: 'EXPIRED' as any,
          plan: 'BASIC' as any,
          listingsLimit: 10,
          featuredLimit: 0,
          leadPriority: 'LOW',
        },
      })
    )
  )

  return NextResponse.json({
    downgraded: updates.length,
    agentIds: expired.map((s) => s.agentId),
  })
}
