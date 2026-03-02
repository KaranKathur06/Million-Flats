import { prisma } from '@/lib/prisma'
import { evaluateAgentRisk } from '@/lib/services/riskEngine'
import { ensureModerationCase, addModerationAction, setCaseRiskWithReasons, setModerationQueue } from '@/lib/services/moderation.service'

export async function approveAgent(input: {
  agentId: string
  actorUserId: string
  actorRole?: string | null
  allowDraftOverride?: boolean
}) {
  const agentId = String(input.agentId || '').trim()
  if (!agentId) return { ok: false as const, status: 404, message: 'Not found' }

  const isOverride = Boolean(input.allowDraftOverride)

  const agent = await (prisma as any).agent.findFirst({
    where: { id: agentId },
    select: { id: true, approved: true, profileStatus: true, userId: true, user: { select: { status: true, role: true } } },
  })

  if (!agent) return { ok: false as const, status: 404, message: 'Not found' }

  const currentProfileStatus = String(agent?.profileStatus || 'DRAFT').toUpperCase()

  if (!isOverride && currentProfileStatus !== 'SUBMITTED') {
    return { ok: false as const, status: 409, message: 'Agent must submit profile before approval' }
  }

  if (isOverride && currentProfileStatus !== 'SUBMITTED' && currentProfileStatus !== 'DRAFT') {
    return { ok: false as const, status: 409, message: `Cannot approve agent from ${currentProfileStatus} state` }
  }

  const beforeState = {
    approved: Boolean(agent.approved),
    profileStatus: currentProfileStatus,
    userStatus: String(agent?.user?.status || 'ACTIVE'),
    userRole: String(agent?.user?.role || ''),
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const updatedAgent = await (tx as any).agent.update({
      where: { id: agentId },
      data: { approved: true, profileStatus: 'VERIFIED' } as any,
      select: { id: true, approved: true, profileStatus: true, userId: true },
    })

    if (String(agent?.user?.role || '').toUpperCase() !== 'AGENT') {
      await (tx as any).user.update({
        where: { id: String(agent.userId) },
        data: { role: 'AGENT' } as any,
        select: { id: true },
      })
    }

    const userAfter = await (tx as any).user.findUnique({
      where: { id: String(agent.userId) },
      select: { role: true },
    })

    const mcase = await ensureModerationCase(tx, {
      entityType: 'AGENT',
      entityId: agentId,
      createdByUserId: input.actorUserId,
    })

    const risk = await evaluateAgentRisk({ agentId })
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

    return { agent: updatedAgent, userAfter }
  })

  const afterState = {
    approved: Boolean(updated.agent.approved),
    profileStatus: String(updated.agent?.profileStatus || '').toUpperCase(),
    userStatus: String(agent?.user?.status || 'ACTIVE'),
    userRole: String(updated.userAfter?.role || agent?.user?.role || ''),
  }

  return { ok: true as const, agent: updated.agent, beforeState, afterState, wasOverride: isOverride && currentProfileStatus === 'DRAFT' }
}
