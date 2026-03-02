import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { approveManualProperty } from '@/lib/services/manualPropertyGovernance.service'
import { prisma } from '@/lib/prisma'
import { decideModerationCase } from '@/lib/services/caseDecision.service'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function hasCover(media: any) {
  const list = Array.isArray(media) ? media : []
  return list.some((m) => String(m?.category || '') === 'COVER' && safeString(m?.url))
}

function isFiniteNumber(v: unknown) {
  return typeof v === 'number' && Number.isFinite(v)
}

function validateForApproval(property: any) {
  if (!property) return { ok: false as const, message: 'Not found' }
  if (String(property.sourceType) !== 'MANUAL') return { ok: false as const, message: 'Only manual listings can be moderated.' }
  if (String(property.status) !== 'PENDING_REVIEW') {
    return { ok: false as const, message: 'Only listings in PENDING_REVIEW can be approved.' }
  }

  if (!safeString(property.title) || safeString(property.title).length < 6) return { ok: false as const, message: 'Missing title.' }
  if (!safeString(property.propertyType)) return { ok: false as const, message: 'Missing property type.' }
  if (!safeString(property.intent)) return { ok: false as const, message: 'Missing sale/rent intent.' }
  if (!isFiniteNumber(property.price) || property.price <= 0) return { ok: false as const, message: 'Missing price.' }
  if (!safeString(property.constructionStatus)) return { ok: false as const, message: 'Missing construction status.' }
  if (!safeString(property.shortDescription) || safeString(property.shortDescription).length < 40) {
    return { ok: false as const, message: 'Missing description.' }
  }

  if (!safeString(property.city) || !safeString(property.community)) return { ok: false as const, message: 'Missing city/community.' }
  if (!isFiniteNumber(property.latitude) || !isFiniteNumber(property.longitude)) {
    return { ok: false as const, message: 'Missing coordinates.' }
  }

  if (!hasCover(property.media)) return { ok: false as const, message: 'Missing cover image.' }
  if (!property.authorizedToMarket) return { ok: false as const, message: 'Agent did not confirm authorization to market.' }

  return { ok: true as const }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_APPROVED',
    windowMs: 60_000,
    max: 30,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const id = String(params?.id || '')
  if (!id) return bad('Not found', 404)

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
      decision: 'APPROVED',
      note: null,
    })

    if (!decided.ok) {
      return bad(decided.message, decided.status)
    }

    await writeAuditLog({
      entityType: 'MANUAL_PROPERTY',
      entityId: id,
      action: 'ADMIN_APPROVED',
      performedByUserId: auth.userId,
      ipAddress: getIp(req),
      beforeState: null,
      afterState: { decision: 'APPROVED', caseId: String(mcase.id) },
      meta: { actor: 'admin', source: 'legacy_route' },
    })

    return NextResponse.json({ success: true, case: decided.case })
  }

  const result = await approveManualProperty({ propertyId: id, actorUserId: auth.userId })
  if (!result.ok) {
    return bad(result.message, result.status)
  }

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_APPROVED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState: result.beforeState,
    afterState: result.afterState,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: result.property })
}
