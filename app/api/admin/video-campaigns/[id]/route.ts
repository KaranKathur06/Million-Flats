import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getVideoCampaignSettings } from '@/lib/videoReels/config'
import { assertAllocationScheduleAvailable, AllocationConflictError, CampaignDestinationSchema } from '@/lib/videoReels/campaigns'
import { writeVideoAudit } from '@/lib/videoReels/audit'

const CapSchema = z.number().int().positive().nullable().optional()

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    startAt: z.string().datetime(),
    priority: z.number().int().min(-1000).max(1000).default(0),
    dailyImpressionCap: CapSchema,
    totalImpressionCap: CapSchema,
    frequencyCap: z.number().int().min(1).max(100).optional(),
    destination: CampaignDestinationSchema.optional(),
  }).strict(),
  z.object({
    action: z.literal('reject'),
    reason: z.string().trim().min(1).max(500),
  }).strict(),
  z.object({ action: z.literal('pause') }).strict(),
  z.object({ action: z.literal('resume') }).strict(),
  z.object({
    action: z.literal('update'),
    startAt: z.string().datetime().optional(),
    priority: z.number().int().min(-1000).max(1000).optional(),
    dailyImpressionCap: CapSchema,
    totalImpressionCap: CapSchema,
    frequencyCap: z.number().int().min(1).max(100).optional(),
    destination: CampaignDestinationSchema.optional(),
  }).strict(),
])

function packageDurationDays(snapshot: unknown) {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return null
  const durationDays = (snapshot as Record<string, unknown>).durationDays
  return Number.isSafeInteger(durationDays) && Number(durationDays) > 0 ? Number(durationDays) : null
}

async function assertScheduleAvailable(tx: Prisma.TransactionClient, params: {
  campaignId: string
  startAt: Date
  endAt: Date
  allocationBps: number
  maxAllocationBps: number
}) {
  const existing = await tx.videoCampaign.findMany({
    where: {
      id: { not: params.campaignId },
      status: { in: ['APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] },
      approvedStartAt: { lt: params.endAt },
      approvedEndAt: { gt: params.startAt },
    },
    select: { id: true, approvedStartAt: true, approvedEndAt: true, allocationBps: true },
  })
  const validIntervals = existing.flatMap((campaign) => (
    campaign.approvedStartAt && campaign.approvedEndAt
      ? [{
        id: campaign.id,
        startAt: campaign.approvedStartAt,
        endAt: campaign.approvedEndAt,
        allocationBps: campaign.allocationBps,
      }]
      : []
  ))
  assertAllocationScheduleAvailable(validIntervals, {
    id: params.campaignId,
    startAt: params.startAt,
    endAt: params.endAt,
    allocationBps: params.allocationBps,
  }, params.maxAllocationBps)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign action' }, { status: 400 })
  const action = parsed.data

  try {
    const campaign = await prisma.videoCampaign.findUnique({
      where: { id: params.id },
      include: { reel: true, order: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Video campaign not found' }, { status: 404 })

    const now = new Date()
    const settings = await getVideoCampaignSettings()

    if (action.action === 'approve') {
      if (campaign.status !== 'PENDING_REVIEW') return NextResponse.json({ error: 'Campaign is not awaiting review' }, { status: 409 })
      if (campaign.reel.moderationStatus !== 'APPROVED' || !campaign.reel.mediaVerifiedAt) {
        return NextResponse.json({ error: 'Campaign creative must be approved and verified' }, { status: 409 })
      }
      const durationDays = packageDurationDays(campaign.packageSnapshot)
      if (!durationDays) return NextResponse.json({ error: 'Campaign package snapshot is invalid' }, { status: 409 })

      const startAt = new Date(action.startAt)
      const endAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
      const maxStartAt = new Date(now.getTime() + settings.schedulingHorizonDays * 24 * 60 * 60 * 1000)
      if (startAt < now || startAt > maxStartAt || campaign.allocationBps > settings.maxAllocationBps) {
        return NextResponse.json({ error: 'Schedule or allocation is outside configured limits' }, { status: 400 })
      }
      const destination = action.destination === undefined
        ? campaign.requestedDestination
        : action.destination
      const result = await prisma.$transaction(async (tx) => {
        await assertScheduleAvailable(tx, {
          campaignId: campaign.id,
          startAt,
          endAt,
          allocationBps: campaign.allocationBps,
          maxAllocationBps: settings.maxAllocationBps,
        })
        const updated = await tx.videoCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'APPROVED_AWAITING_PAYMENT',
            approvedStartAt: startAt,
            approvedEndAt: endAt,
            adminPriority: action.priority,
            dailyImpressionCap: action.dailyImpressionCap === undefined
              ? campaign.dailyImpressionCap
              : action.dailyImpressionCap,
            totalImpressionCap: action.totalImpressionCap === undefined
              ? campaign.totalImpressionCap
              : action.totalImpressionCap,
            frequencyCap: action.frequencyCap ?? campaign.frequencyCap,
            approvedDestination: destination,
            reviewerUserId: auth.userId,
            reviewedAt: now,
            rejectionReason: null,
          },
        })
        await writeVideoAudit(tx, {
          actorUserId: auth.userId,
          entityType: 'CAMPAIGN',
          entityId: campaign.id,
          action: 'CAMPAIGN_APPROVED',
          beforeState: { status: campaign.status },
          afterState: {
            status: updated.status,
            approvedStartAt: startAt.toISOString(),
            approvedEndAt: endAt.toISOString(),
            allocationBps: updated.allocationBps,
            priority: updated.adminPriority,
          },
        })
        return updated
      }, { isolationLevel: 'Serializable' })
      return NextResponse.json({ campaign: result }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action.action === 'reject') {
      if (campaign.status !== 'PENDING_REVIEW') return NextResponse.json({ error: 'Campaign is not awaiting review' }, { status: 409 })
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.videoCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'REJECTED',
            reviewerUserId: auth.userId,
            reviewedAt: now,
            rejectionReason: action.reason,
          },
        })
        await writeVideoAudit(tx, {
          actorUserId: auth.userId,
          entityType: 'CAMPAIGN',
          entityId: campaign.id,
          action: 'CAMPAIGN_REJECTED',
          beforeState: { status: campaign.status },
          afterState: { status: updated.status, reason: action.reason },
        })
        return updated
      })
      return NextResponse.json({ campaign: result }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action.action === 'pause') {
      if (!['SCHEDULED', 'ACTIVE'].includes(campaign.status) || campaign.order?.status !== 'CAPTURED') {
        return NextResponse.json({ error: 'Only paid scheduled or active campaigns can be paused' }, { status: 409 })
      }
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.videoCampaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } })
        await writeVideoAudit(tx, {
          actorUserId: auth.userId,
          entityType: 'CAMPAIGN',
          entityId: campaign.id,
          action: 'CAMPAIGN_PAUSED',
          beforeState: { status: campaign.status },
          afterState: { status: result.status },
        })
        return result
      })
      return NextResponse.json({ campaign: updated }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (action.action === 'resume') {
      if (campaign.status !== 'PAUSED' || campaign.order?.status !== 'CAPTURED') {
        return NextResponse.json({ error: 'Only paid paused campaigns can be resumed' }, { status: 409 })
      }
      if (!campaign.approvedEndAt || campaign.approvedEndAt <= now || !campaign.approvedStartAt) {
        return NextResponse.json({ error: 'Campaign schedule has ended' }, { status: 409 })
      }
      const nextStatus = campaign.approvedStartAt > now ? 'SCHEDULED' : 'ACTIVE'
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.videoCampaign.update({ where: { id: campaign.id }, data: { status: nextStatus } })
        await writeVideoAudit(tx, {
          actorUserId: auth.userId,
          entityType: 'CAMPAIGN',
          entityId: campaign.id,
          action: 'CAMPAIGN_RESUMED',
          beforeState: { status: campaign.status },
          afterState: { status: result.status },
        })
        return result
      })
      return NextResponse.json({ campaign: updated }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!['APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'].includes(campaign.status)) {
      return NextResponse.json({ error: 'Campaign cannot be updated in its current state' }, { status: 409 })
    }

    const durationDays = packageDurationDays(campaign.packageSnapshot)
    if (!durationDays) return NextResponse.json({ error: 'Campaign package snapshot is invalid' }, { status: 409 })
    const startAt = action.startAt ? new Date(action.startAt) : campaign.approvedStartAt
    if (!startAt) return NextResponse.json({ error: 'Approved campaign schedule is missing' }, { status: 409 })
    const endAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000)
    const maxStartAt = new Date(now.getTime() + settings.schedulingHorizonDays * 24 * 60 * 60 * 1000)
    if (startAt < now || startAt > maxStartAt || campaign.allocationBps > settings.maxAllocationBps) {
      return NextResponse.json({ error: 'Schedule or allocation is outside configured limits' }, { status: 400 })
    }
    const destination = action.destination === undefined
      ? campaign.approvedDestination
      : action.destination
    const updated = await prisma.$transaction(async (tx) => {
      if (action.startAt) {
        await assertScheduleAvailable(tx, {
          campaignId: campaign.id,
          startAt,
          endAt,
          allocationBps: campaign.allocationBps,
          maxAllocationBps: settings.maxAllocationBps,
        })
      }
      const result = await tx.videoCampaign.update({
        where: { id: campaign.id },
        data: {
          approvedStartAt: startAt,
          approvedEndAt: endAt,
          adminPriority: action.priority ?? campaign.adminPriority,
          dailyImpressionCap: action.dailyImpressionCap === undefined
            ? campaign.dailyImpressionCap
            : action.dailyImpressionCap,
          totalImpressionCap: action.totalImpressionCap === undefined
            ? campaign.totalImpressionCap
            : action.totalImpressionCap,
          frequencyCap: action.frequencyCap ?? campaign.frequencyCap,
          approvedDestination: destination,
          status: campaign.status === 'APPROVED_AWAITING_PAYMENT' && startAt <= now
            ? 'APPROVED_AWAITING_PAYMENT'
            : campaign.status,
        },
      })
      await writeVideoAudit(tx, {
        actorUserId: auth.userId,
        entityType: 'CAMPAIGN',
        entityId: campaign.id,
        action: 'CAMPAIGN_UPDATED',
        beforeState: {
          status: campaign.status,
          approvedStartAt: campaign.approvedStartAt?.toISOString() || null,
          approvedEndAt: campaign.approvedEndAt?.toISOString() || null,
          priority: campaign.adminPriority,
        },
        afterState: {
          status: result.status,
          approvedStartAt: result.approvedStartAt?.toISOString() || null,
          approvedEndAt: result.approvedEndAt?.toISOString() || null,
          priority: result.adminPriority,
        },
      })
      return result
    }, { isolationLevel: 'Serializable' })
    return NextResponse.json({ campaign: updated }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AllocationConflictError) {
      return NextResponse.json({ error: 'Campaign schedule would exceed rotating inventory' }, { status: 409 })
    }
    console.error('Admin video campaign action failed', error)
    return NextResponse.json({ error: 'Unable to update video campaign' }, { status: 500 })
  }
}
