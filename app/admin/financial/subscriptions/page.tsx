import { prisma } from '@/lib/prisma'
import SubscriptionsClient from './SubscriptionsClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getSubscriptions(searchParams: URLSearchParams) {
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
      { agent: { user: { email: { contains: search, mode: 'insensitive' } } } },
      { agent: { company: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [subscriptions, total] = await Promise.all([
    (prisma as any).agentSubscription.findMany({
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
        payments: {
          where: { status: 'CAPTURED' },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { amount: true, paidAt: true },
        },
      },
    }),
    (prisma as any).agentSubscription.count({ where }),
  ])

  return {
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function SubscriptionsPage({ searchParams }: { searchParams: URLSearchParams }) {
  const data = await getSubscriptions(searchParams)

  return <SubscriptionsClient subscriptions={data.subscriptions} pagination={data.pagination} />
}
