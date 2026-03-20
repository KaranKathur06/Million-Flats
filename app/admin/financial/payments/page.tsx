import { prisma } from '@/lib/prisma'
import { paiseToInr } from '@/lib/razorpay'
import PaymentsClient from './PaymentsClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getPayments(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '25')))
  const status = searchParams.get('status')?.toUpperCase()
  const plan = searchParams.get('plan')?.toUpperCase()
  const search = searchParams.get('search')

  const where: any = {}
  if (status) where.status = status
  if (plan) where.plan = plan
  if (search) {
    where.OR = [
      { razorpayOrderId: { contains: search, mode: 'insensitive' } },
      { razorpayPaymentId: { contains: search, mode: 'insensitive' } },
      { agent: { user: { email: { contains: search, mode: 'insensitive' } } } },
      { agent: { company: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [payments, total] = await Promise.all([
    (prisma as any).payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            id: true,
            company: true,
            user: { select: { name: true, email: true } },
          },
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            endDate: true,
          },
        },
      },
    }),
    (prisma as any).payment.count({ where }),
  ])

  return {
    payments: payments.map((p: any) => ({
      ...p,
      amountInr: paiseToInr(p.amount),
      amountPaidInr: paiseToInr(p.amountPaid),
      amountRefundedInr: paiseToInr(p.amountRefunded),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function PaymentsPage({ searchParams }: { searchParams: URLSearchParams }) {
  const data = await getPayments(searchParams)

  return <PaymentsClient payments={data.payments} pagination={data.pagination} />
}
