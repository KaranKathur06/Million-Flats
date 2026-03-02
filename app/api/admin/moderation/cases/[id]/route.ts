import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_MODERATION_CASE_READ',
    windowMs: 60_000,
    max: 240,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const mcase = await (prisma as any).moderationCase.findUnique({
    where: { id },
    include: {
      actions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              name: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              name: true,
            },
          },
        },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          submittedByUser: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              name: true,
            },
          },
        },
      },
      createdByUser: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          name: true,
        },
      },
    },
  })

  if (!mcase) return bad('Not found', 404)

  // Optional entity hydration (kept lightweight to avoid huge payloads)
  let entity: any = null
  try {
    if (String(mcase.entityType) === 'AGENT') {
      entity = await (prisma as any).agent.findUnique({
        where: { id: String(mcase.entityId) },
        select: {
          id: true,
          approved: true,
          profileStatus: true,
          verificationStatus: true,
          license: true,
          company: true,
          countryCode: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              name: true,
              createdAt: true,
            },
          },
        },
      })
    } else if (String(mcase.entityType) === 'MANUAL_PROPERTY') {
      entity = await (prisma as any).manualProperty.findUnique({
        where: { id: String(mcase.entityId) },
        select: {
          id: true,
          status: true,
          sourceType: true,
          title: true,
          price: true,
          city: true,
          community: true,
          latitude: true,
          longitude: true,
          rejectionReason: true,
          agentId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else if (String(mcase.entityType) === 'USER') {
      entity = await (prisma as any).user.findUnique({
        where: { id: String(mcase.entityId) },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else if (String(mcase.entityType) === 'ECOSYSTEM_PARTNER') {
      entity = await (prisma as any).ecosystemPartner.findUnique({
        where: { id: String(mcase.entityId) },
        select: {
          id: true,
          name: true,
          status: true,
          isFeatured: true,
          isVerified: true,
          subscriptionTier: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, slug: true, title: true } },
        },
      })
    } else if (String(mcase.entityType) === 'ECOSYSTEM_PARTNER_APPLICATION') {
      entity = await (prisma as any).ecosystemPartnerApplication.findUnique({
        where: { id: String(mcase.entityId) },
        select: {
          id: true,
          stage: true,
          createdAt: true,
          updatedAt: true,
          categorySlug: true,
          companyName: true,
          contactEmail: true,
          contactName: true,
        },
      })
    }
  } catch {
    entity = null
  }

  return NextResponse.json({
    success: true,
    case: {
      id: mcase.id,
      entityType: mcase.entityType,
      entityId: mcase.entityId,
      status: mcase.status,
      queue: mcase.queue,
      currentRiskScore: mcase.currentRiskScore,
      lastEvaluatedAt: mcase.lastEvaluatedAt,
      createdAt: mcase.createdAt,
      updatedAt: mcase.updatedAt,
      createdByUser: mcase.createdByUser,
      entity,
      actions: (mcase.actions || []).map((a: any) => ({
        id: a.id,
        decision: a.decision,
        note: a.note,
        riskScoreSnapshot: a.riskScoreSnapshot,
        riskReasonsSnapshot: a.riskReasonsSnapshot,
        riskEngineVersion: a.riskEngineVersion,
        createdAt: a.createdAt,
        actorUser: a.actorUser,
      })),
      messages: (mcase.messages || []).map((m: any) => ({
        id: m.id,
        message: m.message,
        createdAt: m.createdAt,
        actorUser: m.actorUser,
      })),
      reports: (mcase.reports || []).map((r: any) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        submittedByUser: r.submittedByUser,
      })),
    },
  })
}
