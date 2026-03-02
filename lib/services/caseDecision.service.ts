import { prisma } from '@/lib/prisma'
import { evaluateAgentRisk, evaluateManualPropertyRisk, evaluateUserRisk } from '@/lib/services/riskEngine'
import {
  addModerationAction,
  ensureModerationCase,
  setCaseRiskWithReasons,
  setModerationQueue,
  closeModerationCase,
  openModerationCase,
  type ModerationEntityType,
} from '@/lib/services/moderation.service'

export type CaseDecision = 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'ESCALATED' | 'REQUEST_INFO'

function asUpper(v: unknown) {
  return String(v || '').trim().toUpperCase()
}

async function evaluateRiskForEntity(input: { entityType: string; entityId: string }) {
  const type = asUpper(input.entityType)
  const id = String(input.entityId || '').trim()

  if (!id) return { score: 0, reasons: [], version: '1.0.0' }

  if (type === 'MANUAL_PROPERTY') return await evaluateManualPropertyRisk({ propertyId: id })
  if (type === 'AGENT') return await evaluateAgentRisk({ agentId: id })
  if (type === 'USER') return await evaluateUserRisk({ userId: id })

  return { score: 0, reasons: [], version: '1.0.0' }
}

export async function decideModerationCase(input: {
  caseId: string
  actorUserId: string
  actorRole?: string | null
  decision: CaseDecision
  note?: string | null
}) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) return { ok: false as const, status: 404, message: 'Not found' }

  const decision = asUpper(input.decision) as CaseDecision
  const note = input.note == null ? null : String(input.note)

  const isSuperadmin = asUpper(input.actorRole) === 'SUPERADMIN'

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const mcase = await (tx as any).moderationCase.findUnique({ where: { id: caseId } })
      if (!mcase) return { ok: false as const, status: 404, message: 'Not found' }

      // Guarantee canonical case exists on the unique key too
      const canonical = await ensureModerationCase(tx, {
        entityType: String(mcase.entityType) as ModerationEntityType,
        entityId: String(mcase.entityId),
        createdByUserId: mcase.createdByUserId || null,
      })

      if (canonical.id !== mcase.id) {
        // Extremely defensive: if IDs differ, operate on canonical
      }

      const entityType = String(mcase.entityType)
      const entityId = String(mcase.entityId)

      // Deterministic risk recalculation before any decision snapshots
      const risk = await evaluateRiskForEntity({ entityType, entityId })
      await setCaseRiskWithReasons(tx, {
        caseId: mcase.id,
        currentRiskScore: risk.score,
        currentRiskReasons: risk.reasons,
        riskEngineVersion: risk.version,
      })

      if (risk.score >= 50) {
        await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })
      }

      // Entity-specific enforcement
      if (decision === 'APPROVED' || decision === 'REJECTED') {
        if (asUpper(entityType) === 'MANUAL_PROPERTY') {
          const p = await (tx as any).manualProperty.findUnique({
            where: { id: entityId },
            select: { id: true, sourceType: true, status: true },
          })

          if (!p) return { ok: false as const, status: 404, message: 'Not found' }
          if (asUpper(p.sourceType) !== 'MANUAL') {
            return { ok: false as const, status: 409, message: 'Only manual listings can be moderated.' }
          }

          if (asUpper(p.status) !== 'PENDING_REVIEW') {
            return { ok: false as const, status: 409, message: 'Only listings in PENDING_REVIEW can be moderated.' }
          }

          if (decision === 'APPROVED') {
            await (tx as any).manualProperty.update({
              where: { id: entityId },
              data: { status: 'APPROVED', rejectionReason: null } as any,
              select: { id: true },
            })

            await (tx as any).manualPropertyModerationLog.create({
              data: { propertyId: entityId, adminId: input.actorUserId, action: 'APPROVE', reason: null } as any,
            })
          } else {
            const reason = String(note || '').trim()
            if (!reason || reason.length < 3) {
              return { ok: false as const, status: 400, message: 'Rejection reason is required.' }
            }

            await (tx as any).manualProperty.update({
              where: { id: entityId },
              data: { status: 'REJECTED', rejectionReason: reason } as any,
              select: { id: true },
            })

            await (tx as any).manualPropertyModerationLog.create({
              data: { propertyId: entityId, adminId: input.actorUserId, action: 'REJECT', reason } as any,
            })
          }
        } else if (asUpper(entityType) === 'AGENT') {
          const a = await (tx as any).agent.findUnique({
            where: { id: entityId },
            select: { id: true, approved: true, profileStatus: true, userId: true, user: { select: { role: true } } },
          })

          if (!a) return { ok: false as const, status: 404, message: 'Not found' }

          const current = asUpper(a.profileStatus)
          if (decision === 'APPROVED') {
            if (!isSuperadmin && current !== 'SUBMITTED') {
              return { ok: false as const, status: 409, message: 'Agent must submit profile before approval' }
            }
            if (isSuperadmin && current !== 'SUBMITTED' && current !== 'DRAFT') {
              return { ok: false as const, status: 409, message: `Cannot approve agent from ${current} state` }
            }

            await (tx as any).agent.update({
              where: { id: entityId },
              data: { approved: true, profileStatus: 'VERIFIED' } as any,
              select: { id: true },
            })

            if (asUpper(a?.user?.role) !== 'AGENT') {
              await (tx as any).user.update({
                where: { id: String(a.userId) },
                data: { role: 'AGENT' } as any,
                select: { id: true },
              })
            }
          } else {
            const reason = String(note || '').trim()
            if (!reason || reason.length < 3) {
              return { ok: false as const, status: 400, message: 'Rejection reason is required.' }
            }

            // Conservative: keep approved false and move to SUSPENDED
            await (tx as any).agent.update({
              where: { id: entityId },
              data: { approved: false, profileStatus: 'SUSPENDED' } as any,
              select: { id: true },
            })
          }
        }

        await closeModerationCase(tx, { caseId: mcase.id })
      } else {
        // Non-terminal decisions keep the case open
        await openModerationCase(tx, { caseId: mcase.id })
        if (decision === 'FLAGGED' || decision === 'ESCALATED') {
          await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })
        }
      }

      await addModerationAction(tx, {
        caseId: mcase.id,
        actorUserId: input.actorUserId,
        decision,
        note,
        riskScoreSnapshot: risk.score,
        riskReasonsSnapshot: risk.reasons,
        riskEngineVersion: risk.version,
      })

      const updatedCase = await (tx as any).moderationCase.findUnique({
        where: { id: mcase.id },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          status: true,
          queue: true,
          currentRiskScore: true,
          currentRiskReasons: true,
          currentRiskEngineVersion: true,
          lastEvaluatedAt: true,
        },
      })

      return { ok: true as const, case: updatedCase, entityType, entityId }
    })

    return result
  } catch {
    return { ok: false as const, status: 500, message: 'Server error' }
  }
}
