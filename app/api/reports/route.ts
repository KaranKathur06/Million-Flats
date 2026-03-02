import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureModerationCase, addModerationAction, setCaseRiskWithReasons, setModerationQueue, openModerationCase } from '@/lib/services/moderation.service'
import { evaluateAgentRisk, evaluateManualPropertyRisk, evaluateUserRisk, type RiskResult } from '@/lib/services/riskEngine'

export const runtime = 'nodejs'

const BodySchema = z.object({
  entityType: z.enum(['MANUAL_PROPERTY', 'AGENT', 'USER', 'ECOSYSTEM_PARTNER', 'ECOSYSTEM_PARTNER_APPLICATION']),
  entityId: z.string().min(1).max(200),
  reason: z.string().trim().min(3).max(2000),
})

const AUTO_FLAG_REPORTS_THRESHOLD = 3

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function asUpper(v: unknown) {
  return String(v || '').trim().toUpperCase()
}

async function evaluateRisk(entityType: string, entityId: string): Promise<RiskResult> {
  const type = asUpper(entityType)
  if (type === 'MANUAL_PROPERTY') return await evaluateManualPropertyRisk({ propertyId: entityId })
  if (type === 'AGENT') return await evaluateAgentRisk({ agentId: entityId })
  if (type === 'USER') return await evaluateUserRisk({ userId: entityId })
  return { score: 0, reasons: [], version: '1.0.0' }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return bad('Unauthorized', 401)
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) return bad('Unauthorized', 401)

    const dbUser = await (prisma as any).user
      .findUnique({ where: { email }, select: { id: true, status: true } })
      .catch(() => null)

    if (!dbUser?.id) return bad('Unauthorized', 401)

    const status = asUpper(dbUser.status || 'ACTIVE')
    if (status !== 'ACTIVE') {
      return bad('Forbidden', 403)
    }

    const json = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return bad('Invalid payload', 400)
    }

    const entityType = parsed.data.entityType
    const entityId = String(parsed.data.entityId || '').trim()
    if (!entityId) return bad('Invalid payload', 400)

    const out = await prisma.$transaction(async (tx: any) => {
      const mcase = await ensureModerationCase(tx, {
        entityType,
        entityId,
        createdByUserId: dbUser.id,
      })

      const report = await (tx as any).report.create({
        data: {
          caseId: mcase.id,
          submittedByUserId: dbUser.id,
          entityType,
          entityId,
          reason: parsed.data.reason,
          status: 'OPEN',
        },
        select: { id: true, status: true, createdAt: true },
      })

      const openReports = await (tx as any).report.count({
        where: {
          caseId: mcase.id,
          status: 'OPEN',
        },
      })

      const risk = await evaluateRisk(entityType, entityId)
      await setCaseRiskWithReasons(tx, {
        caseId: mcase.id,
        currentRiskScore: risk.score,
        currentRiskReasons: risk.reasons,
        riskEngineVersion: risk.version,
      })

      await openModerationCase(tx, { caseId: mcase.id })

      const shouldAutoFlag = typeof openReports === 'number' && openReports >= AUTO_FLAG_REPORTS_THRESHOLD
      if (shouldAutoFlag) {
        await setModerationQueue(tx, { caseId: mcase.id, queue: 'HIGH_RISK' })

        await addModerationAction(tx, {
          caseId: mcase.id,
          actorUserId: null,
          decision: 'FLAGGED',
          note: `Auto-flagged by system: reports threshold reached (${openReports})` as any,
          riskScoreSnapshot: risk.score,
          riskReasonsSnapshot: {
            reasons: risk.reasons,
            reports: { openReports, threshold: AUTO_FLAG_REPORTS_THRESHOLD },
          },
          riskEngineVersion: risk.version,
        })
      }

      const updatedCase = await (tx as any).moderationCase.findUnique({
        where: { id: mcase.id },
        select: { id: true, status: true, queue: true, currentRiskScore: true, currentRiskEngineVersion: true, lastEvaluatedAt: true },
      })

      return { report, case: updatedCase, openReports }
    })

    return NextResponse.json({ success: true, report: out.report, case: out.case, openReports: out.openReports })
  } catch (e) {
    console.error('Report create: failed', e)
    return bad('Failed to submit report', 500)
  }
}
