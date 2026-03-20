import { prisma } from '@/lib/prisma'
import WebhooksClient from './WebhooksClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function getParam(sp: { [key: string]: string | string[] | undefined } | undefined, key: string) {
  const v = sp?.[key]
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

async function getWebhooks(searchParams: { [key: string]: string | string[] | undefined } | undefined) {
  const page = Math.max(1, parseInt(getParam(searchParams, 'page') || '1'))
  const limit = Math.min(50, Math.max(10, parseInt(getParam(searchParams, 'limit') || '25')))
  const eventType = getParam(searchParams, 'event')
  const processed = getParam(searchParams, 'processed')

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

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const data = await getWebhooks(searchParams)

  return <WebhooksClient webhooks={data.webhooks} pagination={data.pagination} />
}
