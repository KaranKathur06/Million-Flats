import { prisma } from '@/lib/prisma'
import { paiseToInr } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getRevenueStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    currentMonthRevenue,
    lastMonthRevenue,
    totalRevenue,
    revenueByPlan,
    revenueByMonth,
  ] = await Promise.all([
    (prisma as any).payment.aggregate({
      where: {
        status: 'CAPTURED',
        paidAt: { gte: startOfMonth },
      },
      _sum: { amountPaid: true },
    }),

    (prisma as any).payment.aggregate({
      where: {
        status: 'CAPTURED',
        paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amountPaid: true },
    }),

    (prisma as any).payment.aggregate({
      where: { status: 'CAPTURED' },
      _sum: { amountPaid: true },
    }),

    (prisma as any).$queryRaw`
      SELECT plan, SUM(amount_paid) as revenue
      FROM payments
      WHERE status = 'CAPTURED'
      GROUP BY plan
    `,

    (prisma as any).$queryRaw`
      SELECT 
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        SUM(amount_paid) as revenue
      FROM payments
      WHERE status = 'CAPTURED'
        AND paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY month ASC
    `,
  ])

  return {
    currentMonthRevenue: currentMonthRevenue._sum.amountPaid || 0,
    lastMonthRevenue: lastMonthRevenue._sum.amountPaid || 0,
    totalRevenue: totalRevenue._sum.amountPaid || 0,
    revenueByPlan: revenueByPlan as Array<{ plan: string; revenue: bigint }>,
    revenueByMonth: revenueByMonth as Array<{ month: string; revenue: bigint }>,
  }
}

export default async function RevenuePage() {
  const stats = await getRevenueStats()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const monthOverMonthGrowth = stats.lastMonthRevenue > 0
    ? ((stats.currentMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[23px] font-extrabold text-white/95 tracking-tight">Revenue Analytics</h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">
            Track revenue growth and financial performance
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Month */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/[0.12] to-emerald-600/[0.03] border border-emerald-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300/80 mb-2">This Month</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{formatCurrency(paiseToInr(stats.currentMonthRevenue))}</p>
              {monthOverMonthGrowth !== 0 && (
                <p className={`text-[11px] font-semibold mt-1 ${monthOverMonthGrowth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}% vs last month
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Last Month */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/[0.12] to-blue-600/[0.03] border border-blue-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-300/80 mb-2">Last Month</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{formatCurrency(paiseToInr(stats.lastMonthRevenue))}</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.12] to-amber-600/[0.03] border border-amber-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300/80 mb-2">Total Revenue</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">{formatCurrency(paiseToInr(stats.totalRevenue))}</p>
            </div>
          </div>
        </div>

        {/* Average Monthly */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/[0.12] to-purple-600/[0.03] border border-purple-400/[0.15] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-purple-300/80 mb-2">Avg Monthly</p>
              <p className="text-[22px] font-extrabold text-white tracking-tight">
                {formatCurrency(paiseToInr(stats.totalRevenue) / Math.max(1, stats.revenueByMonth.length))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
        <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight mb-6">Revenue by Plan</h2>
        <div className="space-y-4">
          {stats.revenueByPlan.map((item) => {
            const revenue = paiseToInr(Number(item.revenue))
            const percentage = stats.totalRevenue > 0 ? (Number(item.revenue) / stats.totalRevenue) * 100 : 0

            return (
              <div key={item.plan}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-white/90">{item.plan}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-semibold text-white/90">{formatCurrency(revenue)}</span>
                    <span className="text-[11px] text-white/50">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue by Month (12 months) */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
        <h2 className="text-[17px] font-extrabold text-white/95 tracking-tight mb-6">Revenue Trend (12 Months)</h2>
        <div className="h-[200px] flex items-end gap-2">
          {stats.revenueByMonth.map((item, index) => {
            const maxRevenue = Math.max(...stats.revenueByMonth.map((r) => Number(r.revenue)))
            const height = maxRevenue > 0 ? (Number(item.revenue) / maxRevenue) * 100 : 0
            const isCurrentMonth = index === stats.revenueByMonth.length - 1

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center gap-2 group"
                title={`${item.month}: ${formatCurrency(paiseToInr(Number(item.revenue)))}`}
              >
                <div className="relative w-full flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-200 group-hover:opacity-80 ${
                      isCurrentMonth
                        ? 'bg-gradient-to-t from-emerald-500/60 to-emerald-400/80 shadow-lg shadow-emerald-500/20'
                        : 'bg-gradient-to-t from-emerald-500/30 to-emerald-400/50'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-white/40 group-hover:text-white/70 transition-colors">
                  {item.month.split('-')[1]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
