import { prisma } from '@/lib/prisma'
import { evaluateManualPropertyRisk } from '@/lib/services/riskEngine'
import { ensureModerationCase, addModerationAction, setCaseRiskWithReasons, setModerationQueue } from '@/lib/services/moderation.service'

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

export async function approveManualProperty(input: { propertyId: string; actorUserId: string }) {
  const propertyId = String(input.propertyId || '').trim()
  if (!propertyId) return { ok: false as const, status: 404, message: 'Not found' }

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id: propertyId, sourceType: 'MANUAL' },
    include: { media: true },
  })

  const check = validateForApproval(property)
  if (!check.ok) return { ok: false as const, status: 400, message: check.message }

  const beforeState = { status: String(property.status || 'PENDING_REVIEW') }

  const updated = await prisma.$transaction(async (tx: any) => {
    const updatedProperty = await (tx as any).manualProperty.update({
      where: { id: propertyId },
      data: { status: 'APPROVED', rejectionReason: null } as any,
      select: { id: true, status: true },
    })

    await (tx as any).manualPropertyModerationLog.create({
      data: { propertyId, adminId: input.actorUserId, action: 'APPROVE', reason: null } as any,
    })

    const mcase = await ensureModerationCase(tx, {
      entityType: 'MANUAL_PROPERTY',
      entityId: propertyId,
      createdByUserId: input.actorUserId,
    })

    const risk = await evaluateManualPropertyRisk({ propertyId })
    await setCaseRiskWithReasons(tx, {
      caseId: mcase.id,
      currentRiskScore: risk.score,
      currentRiskReasons: risk.reasons,
      riskEngineVersion: risk.version,
    })

    if (risk.score >= 50) {
      await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })
    }

    await addModerationAction(tx, {
      caseId: mcase.id,
      actorUserId: input.actorUserId,
      decision: 'APPROVED',
      note: null,
      riskScoreSnapshot: risk.score,
      riskReasonsSnapshot: risk.reasons,
      riskEngineVersion: risk.version,
    })

    return updatedProperty
  })

  const afterState = { status: String(updated.status || 'APPROVED') }

  return { ok: true as const, property: updated, beforeState, afterState }
}

export async function rejectManualProperty(input: { propertyId: string; actorUserId: string; reason: string }) {
  const propertyId = String(input.propertyId || '').trim()
  if (!propertyId) return { ok: false as const, status: 404, message: 'Not found' }

  const reason = String(input.reason || '').trim()
  if (reason.length < 3) return { ok: false as const, status: 400, message: 'Rejection reason is required.' }

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id: propertyId, sourceType: 'MANUAL' },
    select: { id: true, status: true, sourceType: true },
  })

  if (!property) return { ok: false as const, status: 404, message: 'Not found' }
  if (String(property.sourceType) !== 'MANUAL') return { ok: false as const, status: 400, message: 'Only manual listings can be moderated.' }
  if (String(property.status) !== 'PENDING_REVIEW') {
    return { ok: false as const, status: 400, message: 'Only listings in PENDING_REVIEW can be rejected.' }
  }

  const beforeState = { status: String(property.status || 'PENDING_REVIEW') }

  const updated = await prisma.$transaction(async (tx: any) => {
    const updatedProperty = await (tx as any).manualProperty.update({
      where: { id: propertyId },
      data: { status: 'REJECTED', rejectionReason: reason } as any,
      select: { id: true, status: true },
    })

    await (tx as any).manualPropertyModerationLog.create({
      data: { propertyId, adminId: input.actorUserId, action: 'REJECT', reason } as any,
    })

    const mcase = await ensureModerationCase(tx, {
      entityType: 'MANUAL_PROPERTY',
      entityId: propertyId,
      createdByUserId: input.actorUserId,
    })

    const risk = await evaluateManualPropertyRisk({ propertyId })
    await setCaseRiskWithReasons(tx, {
      caseId: mcase.id,
      currentRiskScore: risk.score,
      currentRiskReasons: risk.reasons,
      riskEngineVersion: risk.version,
    })

    if (risk.score >= 50) {
      await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })
    }

    await addModerationAction(tx, {
      caseId: mcase.id,
      actorUserId: input.actorUserId,
      decision: 'REJECTED',
      note: reason,
      riskScoreSnapshot: risk.score,
      riskReasonsSnapshot: risk.reasons,
      riskEngineVersion: risk.version,
    })

    return updatedProperty
  })

  const afterState = { status: String(updated.status || 'REJECTED') }

  return { ok: true as const, property: updated, beforeState, afterState }
}
