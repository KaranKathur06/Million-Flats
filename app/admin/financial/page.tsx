import { prisma } from '@/lib/prisma'
import { paiseToInr } from '@/lib/razorpay'
import FinancialOverviewClient from './FinancialOverviewClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getFinancialStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalRevenue,
    monthlyRevenue,
    activeSubscriptions,
    failedPayments,
    trialUsers,
    recentPayments,
    revenueByDay,
  ] = await Promise.all([
    // Total revenue (all captured payments)
    (prisma as any).payment.aggregate({
      where: { status: 'CAPTURED' },
      _sum: { amountPaid: true },
    }),

    // Monthly revenue
    (prisma as any).payment.aggregate({
      where: {
        status: 'CAPTURED',
        paidAt: { gte: startOfMonth },
      },
      _sum: { amountPaid: true },
    }),

    // Active subscriptions
    (prisma as any).agentSubscription.count({
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
    }),

    // Failed payments (last 30 days)
    (prisma as any).payment.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Trial users
    (prisma as any).agentSubscription.count({
      where: { status: 'TRIAL' },
    }),

    // Recent payments (last 10)
    (prisma as any).payment.findMany({
      where: { status: { in: ['CAPTURED', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        agent: {
          select: {
            id: true,
            company: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),

    // Revenue by day (last 30 days)
    (prisma as any).$queryRaw`
      SELECT 
        DATE(paid_at) as date,
        SUM(amount_paid) as revenue
      FROM payments
      WHERE status = 'CAPTURED'
        AND paid_at >= ${thirtyDaysAgo}
      GROUP BY DATE(paid_at)
      ORDER BY date ASC
    `,
  ])

  return {
    totalRevenue: totalRevenue._sum.amountPaid || 0,
    monthlyRevenue: monthlyRevenue._sum.amountPaid || 0,
    activeSubscriptions,
    failedPayments,
    trialUsers,
    recentPayments,
    revenueByDay: revenueByDay as Array<{ date: string; revenue: bigint }>,
  }
}

export default async function FinancialOverviewPage() {
  const stats = await getFinancialStats()

  return (
    <FinancialOverviewClient
      totalRevenue={paiseToInr(stats.totalRevenue)}
      monthlyRevenue={paiseToInr(stats.monthlyRevenue)}
      activeSubscriptions={stats.activeSubscriptions}
      failedPayments={stats.failedPayments}
      trialUsers={stats.trialUsers}
      recentPayments={stats.recentPayments.map((p: any) => ({
        ...p,
        amountInr: paiseToInr(p.amount),
        amountPaidInr: paiseToInr(p.amountPaid),
      }))}
      revenueByDay={stats.revenueByDay.map((r: any) => ({
        date: r.date,
        revenue: paiseToInr(Number(r.revenue)),
      }))}
    />
  )
}
