import { prisma } from '@/lib/prisma'

export type ModerationEntityType =
  | 'MANUAL_PROPERTY'
  | 'AGENT'
  | 'USER'
  | 'ECOSYSTEM_PARTNER'
  | 'ECOSYSTEM_PARTNER_APPLICATION'

export type ModerationDecision = 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'ESCALATED' | 'REQUEST_INFO'

export const RISK_ENGINE_VERSION = '1.0.0'

export async function ensureModerationCase(tx: any, input: {
  entityType: ModerationEntityType
  entityId: string
  createdByUserId?: string | null
}) {
  const entityId = String(input.entityId || '').trim()
  if (!entityId) throw new Error('Missing entity id')

  const entityType = String(input.entityType || '').trim().toUpperCase() as ModerationEntityType

  return await (tx as any).moderationCase.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    create: {
      entityType,
      entityId,
      status: 'OPEN',
      queue: 'NORMAL',
      currentRiskScore: 0,
      createdByUserId: input.createdByUserId || null,
    },
    update: {},
    select: { id: true, entityType: true, entityId: true },
  })
}

export async function addModerationAction(tx: any, input: {
  caseId: string
  actorUserId?: string | null
  decision: ModerationDecision
  note?: string | null
  riskScoreSnapshot: number
  riskReasonsSnapshot?: unknown
  riskEngineVersion?: string
}) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  const riskEngineVersion = String(input.riskEngineVersion || RISK_ENGINE_VERSION).trim() || RISK_ENGINE_VERSION

  return await (tx as any).moderationAction.create({
    data: {
      caseId,
      actorUserId: input.actorUserId || null,
      decision: input.decision,
      note: input.note || null,
      riskScoreSnapshot: Number.isFinite(input.riskScoreSnapshot) ? input.riskScoreSnapshot : 0,
      riskReasonsSnapshot: (input.riskReasonsSnapshot as any) ?? null,
      riskEngineVersion,
    },
    select: { id: true },
  })
}

export async function closeModerationCase(tx: any, input: { caseId: string }) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  return await (tx as any).moderationCase.update({
    where: { id: caseId },
    data: { status: 'CLOSED' },
    select: { id: true, status: true },
  })
}

export async function openModerationCase(tx: any, input: { caseId: string }) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  return await (tx as any).moderationCase.update({
    where: { id: caseId },
    data: { status: 'OPEN' },
    select: { id: true, status: true },
  })
}

export async function setModerationQueue(tx: any, input: { caseId: string; queue: 'NORMAL' | 'HIGH_RISK' }) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  return await (tx as any).moderationCase.update({
    where: { id: caseId },
    data: { queue: input.queue },
    select: { id: true, queue: true },
  })
}

export async function setCaseRisk(tx: any, input: { caseId: string; currentRiskScore: number }) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  return await (tx as any).moderationCase.update({
    where: { id: caseId },
    data: {
      currentRiskScore: Number.isFinite(input.currentRiskScore) ? input.currentRiskScore : 0,
      lastEvaluatedAt: new Date(),
    },
    select: { id: true },
  })
}

export async function setCaseRiskWithReasons(
  tx: any,
  input: {
    caseId: string
    currentRiskScore: number
    currentRiskReasons?: unknown
    riskEngineVersion?: string
  }
) {
  const caseId = String(input.caseId || '').trim()
  if (!caseId) throw new Error('Missing moderation case id')

  const riskEngineVersion = String(input.riskEngineVersion || RISK_ENGINE_VERSION).trim() || RISK_ENGINE_VERSION

  return await (tx as any).moderationCase.update({
    where: { id: caseId },
    data: {
      currentRiskScore: Number.isFinite(input.currentRiskScore) ? input.currentRiskScore : 0,
      currentRiskReasons: (input.currentRiskReasons as any) ?? null,
      currentRiskEngineVersion: riskEngineVersion,
      lastEvaluatedAt: new Date(),
    },
    select: { id: true },
  })
}

export async function withTx<T>(fn: (tx: any) => Promise<T>) {
  return await prisma.$transaction(async (tx: any) => fn(tx))
}
