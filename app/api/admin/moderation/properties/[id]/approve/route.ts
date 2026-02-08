import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
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

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '')
  if (!id) return bad('Not found', 404)

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    include: { media: true },
  })

  const check = validateForApproval(property)
  if (!check.ok) return bad(check.message)

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'APPROVED',
      rejectionReason: null,
    } as any,
    select: { id: true, status: true },
  })

  await (prisma as any).manualPropertyModerationLog.create({
    data: {
      propertyId: id,
      adminId: auth.userId,
      action: 'APPROVE',
      reason: null,
    } as any,
  })

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_APPROVED',
    performedByUserId: auth.userId,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: updated })
}
