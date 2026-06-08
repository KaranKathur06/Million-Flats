import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number.parseInt(String(v || ''), 10)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function asEntityType(v: string | null) {
  const s = String(v || '').trim().toUpperCase()
  if (
    s === 'MANUAL_PROPERTY' ||
    s === 'AGENT' ||
    s === 'USER' ||
    s === 'ECOSYSTEM_PARTNER' ||
    s === 'ECOSYSTEM_PARTNER_APPLICATION'
  ) {
    return s
  }
  return null
}

function asStatus(v: string | null) {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'OPEN' || s === 'CLOSED') return s
  return null
}

function asQueue(v: string | null) {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'NORMAL' || s === 'HIGH_RISK') return s
  return null
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_MODERATION_QUEUE_READ',
    windowMs: 60_000,
    max: 120,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const url = new URL(req.url)

  const entityType = asEntityType(url.searchParams.get('entityType'))
  const status = asStatus(url.searchParams.get('status'))
  const queue = asQueue(url.searchParams.get('queue'))

  const page = clampInt(url.searchParams.get('page'), 1, 1, 10_000)
  const pageSize = clampInt(url.searchParams.get('pageSize'), 25, 1, 100)

  const where: any = {}
  if (entityType) where.entityType = entityType
  if (status) where.status = status
  if (queue) where.queue = queue

  const skip = (page - 1) * pageSize

  const [total, cases] = await Promise.all([
    (prisma as any).moderationCase.count({ where }),
    (prisma as any).moderationCase.findMany({
      where,
      orderBy: [{ currentRiskScore: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take: pageSize,
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        reports: {
          where: { status: 'OPEN' },
          select: { id: true },
          take: 5,
        },
      },
    }),
  ])

  const data = cases.map((c: any) => {
    const latestAction = Array.isArray(c.actions) ? c.actions[0] : null
    const openReportsCount = Array.isArray(c.reports) ? c.reports.length : 0

    return {
      id: c.id,
      entityType: c.entityType,
      entityId: c.entityId,
      status: c.status,
      queue: c.queue,
      currentRiskScore: c.currentRiskScore,
      lastEvaluatedAt: c.lastEvaluatedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      openReportsCount,
      latestAction: latestAction
        ? {
            id: latestAction.id,
            decision: latestAction.decision,
            note: latestAction.note,
            riskScoreSnapshot: latestAction.riskScoreSnapshot,
            riskEngineVersion: latestAction.riskEngineVersion,
            createdAt: latestAction.createdAt,
          }
        : null,
    }
  })

  return NextResponse.json({
    success: true,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    cases: data,
  })
}
