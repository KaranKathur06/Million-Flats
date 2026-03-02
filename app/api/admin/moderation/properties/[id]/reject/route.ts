import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { rejectManualProperty } from '@/lib/services/manualPropertyGovernance.service'
import { prisma } from '@/lib/prisma'
import { decideModerationCase } from '@/lib/services/caseDecision.service'

const RejectSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
})

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_REJECTED',
    windowMs: 60_000,
    max: 30,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const id = String(params?.id || '')
  if (!id) return bad('Not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) return bad('Rejection reason is required.')

  const mcase = await (prisma as any).moderationCase
    .upsert({
      where: { entityType_entityId: { entityType: 'MANUAL_PROPERTY', entityId: id } },
      create: {
        entityType: 'MANUAL_PROPERTY',
        entityId: id,
        status: 'OPEN',
        queue: 'NORMAL',
        currentRiskScore: 0,
        createdByUserId: auth.userId,
      },
      update: {},
      select: { id: true },
    })
    .catch(() => null)

  if (mcase?.id) {
    const decided = await decideModerationCase({
      caseId: String(mcase.id),
      actorUserId: auth.userId,
      actorRole: auth.role,
      decision: 'REJECTED',
      note: parsed.data.reason,
    })

    if (!decided.ok) {
      return bad(decided.message, decided.status)
    }

    await writeAuditLog({
      entityType: 'MANUAL_PROPERTY',
      entityId: id,
      action: 'ADMIN_REJECTED',
      performedByUserId: auth.userId,
      ipAddress: getIp(req),
      beforeState: null,
      afterState: { decision: 'REJECTED', caseId: String(mcase.id) },
      meta: { actor: 'admin', source: 'legacy_route' },
    })

    return NextResponse.json({ success: true, case: decided.case })
  }

  const result = await rejectManualProperty({
    propertyId: id,
    actorUserId: auth.userId,
    reason: parsed.data.reason,
  })

  if (!result.ok) {
    return bad(result.message, result.status)
  }

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_REJECTED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState: result.beforeState,
    afterState: result.afterState,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: result.property })
}
