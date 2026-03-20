import { prisma } from '@/lib/prisma'
import SubscriptionsClient from './SubscriptionsClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function getParam(sp: { [key: string]: string | string[] | undefined } | undefined, key: string) {
  const v = sp?.[key]
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

async function getSubscriptions(searchParams: { [key: string]: string | string[] | undefined } | undefined) {
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

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const data = await getSubscriptions(searchParams)

  return <SubscriptionsClient subscriptions={data.subscriptions} pagination={data.pagination} />
}
