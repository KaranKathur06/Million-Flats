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
    select: {
      id: true,
      approved: true,
      profileStatus: true,
      verificationStatus: true,
      status: true,
      userId: true,
      user: { select: { status: true, role: true } },
    },
  })

  if (!agent) return { ok: false as const, status: 404, message: 'Not found' }

  const currentProfileStatus = String(agent?.profileStatus || 'DRAFT').toUpperCase()
  const currentStatus = String(agent?.status || 'REGISTERED').toUpperCase()
  const alreadyApproved = Boolean(agent.approved)

  // Reject if already suspended or rejected
  if (currentStatus === 'REJECTED' || currentStatus === 'SUSPENDED') {
    return { ok: false as const, status: 409, message: `Cannot approve agent from ${currentStatus} state` }
  }

  // For non-superadmin: require profile submitted or already in review
  if (!alreadyApproved && !isOverride) {
    const validStatesForApproval = ['SUBMITTED', 'VERIFIED', 'UNDER_REVIEW']
    if (!validStatesForApproval.includes(currentProfileStatus)) {
      return { ok: false as const, status: 409, message: 'Agent must submit profile before approval' }
    }
  }

  // For superadmin: allow draft override
  if (!alreadyApproved && isOverride && currentProfileStatus !== 'SUBMITTED' && currentProfileStatus !== 'DRAFT' && currentProfileStatus !== 'VERIFIED' && currentProfileStatus !== 'UNDER_REVIEW') {
    return { ok: false as const, status: 409, message: `Cannot approve agent from ${currentProfileStatus} state` }
  }

  const beforeState = {
    approved: Boolean(agent.approved),
    profileStatus: currentProfileStatus,
    verificationStatus: String(agent?.verificationStatus || 'PENDING').toUpperCase(),
    status: String(agent?.status || 'REGISTERED').toUpperCase(),
    userStatus: String(agent?.user?.status || 'ACTIVE'),
    userRole: String(agent?.user?.role || ''),
  }

  try {
    // Evaluate risk before transaction to avoid nested queries
    const risk = await evaluateAgentRisk({ agentId })

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedAgent = await (tx as any).agent.update({
        where: { id: agentId },
        data: {
          approved: true,
          profileStatus: 'VERIFIED',
          verificationStatus: 'APPROVED',
          status: 'APPROVED',
          approvedBy: input.actorUserId,
          approvedAt: new Date(),
        } as any,
        select: { id: true, approved: true, profileStatus: true, verificationStatus: true, status: true, userId: true },
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
      verificationStatus: String(updated.agent?.verificationStatus || '').toUpperCase(),
      status: String(updated.agent?.status || '').toUpperCase(),
      userStatus: String(agent?.user?.status || 'ACTIVE'),
      userRole: String(updated.userAfter?.role || agent?.user?.role || ''),
    }

    return {
      ok: true as const,
      agent: updated.agent,
      beforeState,
      afterState,
      wasOverride: !alreadyApproved && isOverride && currentProfileStatus === 'DRAFT',
    }
  } catch (error) {
    console.error('[approveAgent] Transaction error:', error instanceof Error ? error.message : error)
    return { ok: false as const, status: 500, message: 'Failed to approve agent: internal server error' }
  }
}
