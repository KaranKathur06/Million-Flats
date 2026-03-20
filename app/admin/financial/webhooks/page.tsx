import { prisma } from '@/lib/prisma'
import WebhooksClient from './WebhooksClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

async function getWebhooks(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '25')))
  const eventType = searchParams.get('event')
  const processed = searchParams.get('processed')

  const where: any = {}
  if (eventType) where.eventType = eventType
  if (processed) where.processed = processed === 'true'

  const [webhooks, total] = await Promise.all([
    (prisma as any).paymentWebhook.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        payment: {
          select: {
            id: true,
            agentId: true,
            plan: true,
            amount: true,
          },
        },
      },
    }),
    (prisma as any).paymentWebhook.count({ where }),
  ])

  return {
    webhooks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function WebhooksPage({ searchParams }: { searchParams: URLSearchParams }) {
  const data = await getWebhooks(searchParams)

  return <WebhooksClient webhooks={data.webhooks} pagination={data.pagination} />
}
