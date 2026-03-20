import { prisma } from '@/lib/prisma'
import { paiseToInr } from '@/lib/razorpay'
import PaymentsClient from './PaymentsClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function getParam(sp: { [key: string]: string | string[] | undefined } | undefined, key: string) {
  const v = sp?.[key]
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

async function getPayments(searchParams: { [key: string]: string | string[] | undefined } | undefined) {
  const page = Math.max(1, parseInt(getParam(searchParams, 'page') || '1'))
  const limit = Math.min(50, Math.max(10, parseInt(getParam(searchParams, 'limit') || '25')))
  const status = getParam(searchParams, 'status')?.toUpperCase()
  const plan = getParam(searchParams, 'plan')?.toUpperCase()
  const search = getParam(searchParams, 'search')

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

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const data = await getPayments(searchParams)

  return <PaymentsClient payments={data.payments} pagination={data.pagination} />
}
