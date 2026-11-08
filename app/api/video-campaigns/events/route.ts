import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma, VideoCampaignEventType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'
import { consumeVideoRateLimit } from '@/lib/videoReels/rateLimit'
import { getViewerHmacCandidates, readCookie, verifyVideoDeliveryToken, VIDEO_VIEWER_COOKIE } from '@/lib/videoReels/tokens'

export const runtime = 'nodejs'

const EventSchema = z.object({
  token: z.string().min(10).max(4096),
  eventId: z.string().uuid(),
  type: z.nativeEnum(VideoCampaignEventType),
  visibleRatio: z.number().min(0).max(1).optional(),
  visibleMs: z.number().int().min(0).max(60_000).optional(),
  playbackMs: z.number().int().min(0).max(60_000).optional(),
  mediaEnded: z.boolean().optional(),
  destinationActivated: z.boolean().optional(),
  shareActivated: z.boolean().optional(),
}).strict()

const DAILY_METRIC_FIELD: Record<VideoCampaignEventType, string> = {
  IMPRESSION: 'impressions',
  START: 'starts',
  QUALIFIED_VIEW: 'qualifiedViews',
  COMPLETE: 'completions',
  CLICK: 'clicks',
  ENGAGEMENT: 'engagements',
}

function isDuplicateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function POST(request: Request) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video analytics are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const parsed = EventSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid video event' }, { status: 400 })

  const token = verifyVideoDeliveryToken(parsed.data.token)
  const viewerCookie = readCookie(request, VIDEO_VIEWER_COOKIE)
  if (!token || !viewerCookie) return NextResponse.json({ error: 'Invalid or expired delivery token' }, { status: 401 })

  let viewerHmacs: string[]
  try {
    viewerHmacs = getViewerHmacCandidates(viewerCookie)
  } catch {
    return NextResponse.json({ error: 'Video analytics are temporarily unavailable' }, { status: 503 })
  }
  if (!viewerHmacs.includes(token.viewerHmac)) {
    return NextResponse.json({ error: 'Delivery token does not match this viewer' }, { status: 403 })
  }

  try {
    const rate = await consumeVideoRateLimit(`event:${token.viewerHmac}`, 120, 60)
    if (!rate.allowed) return NextResponse.json({ error: 'Video event limit reached' }, { status: 429 })

    const assignment = await prisma.videoRotationAssignment.findUnique({
      where: { deliveryTokenId: token.id },
      include: { campaign: { include: { reel: true } } },
    })
    if (
      !assignment
      || assignment.campaignId !== token.campaignId
      || assignment.campaign?.reelId !== token.reelId
      || !assignment.viewerHmac
      || !viewerHmacs.includes(assignment.viewerHmac)
      || !assignment.campaign
      || assignment.campaign.reel.durationMs < 1
    ) {
      return NextResponse.json({ error: 'Delivery assignment was not found' }, { status: 404 })
    }

    const eventType = parsed.data.type
    const elapsedMs = Date.now() - token.issuedAt * 1000
    if (elapsedMs < 0) return NextResponse.json({ error: 'Invalid event timing' }, { status: 400 })
    if (eventType === 'IMPRESSION' && (
      (parsed.data.visibleRatio ?? 0) < 0.5
      || (parsed.data.visibleMs ?? 0) < 1000
      || elapsedMs < 1000
    )) {
      return NextResponse.json({ error: 'Impression visibility threshold was not met' }, { status: 400 })
    }
    if (eventType === 'QUALIFIED_VIEW' && (
      (parsed.data.playbackMs ?? 0) < 10_000
      || elapsedMs < 10_000
      || (parsed.data.playbackMs ?? 0) > assignment.campaign.reel.durationMs
    )) {
      return NextResponse.json({ error: 'Qualified-view threshold was not met' }, { status: 400 })
    }
    if (eventType === 'COMPLETE' && (
      parsed.data.mediaEnded !== true
      || (parsed.data.playbackMs ?? 0) < assignment.campaign.reel.durationMs
      || elapsedMs < assignment.campaign.reel.durationMs
    )) {
      return NextResponse.json({ error: 'Completion threshold was not met' }, { status: 400 })
    }
    if (eventType === 'CLICK' && (
      parsed.data.destinationActivated !== true
      || !assignment.campaign.approvedDestination
    )) {
      return NextResponse.json({ error: 'Click event is not valid for this creative' }, { status: 400 })
    }
    if (eventType === 'ENGAGEMENT' && parsed.data.shareActivated !== true) {
      return NextResponse.json({ error: 'Engagement must be a user-initiated share action' }, { status: 400 })
    }

    const requiredPriorEvent = eventType === 'QUALIFIED_VIEW' || eventType === 'COMPLETE'
      ? 'START'
      : 'IMPRESSION'
    let priorEventCreatedAt: Date | null = null
    if (eventType !== 'IMPRESSION') {
      const priorEvent = await prisma.videoCampaignEvent.findUnique({
        where: {
          deliveryTokenId_eventType: {
            deliveryTokenId: token.id,
            eventType: requiredPriorEvent,
          },
        },
        select: { id: true, createdAt: true },
      })
      if (!priorEvent) return NextResponse.json({ error: 'Event sequence is invalid' }, { status: 409 })
      priorEventCreatedAt = priorEvent.createdAt
    }
    if (eventType === 'QUALIFIED_VIEW' && priorEventCreatedAt && Date.now() - priorEventCreatedAt.getTime() < 10_000) {
      return NextResponse.json({ error: 'Qualified-view threshold was not met' }, { status: 400 })
    }
    if (eventType === 'COMPLETE' && priorEventCreatedAt && Date.now() - priorEventCreatedAt.getTime() < assignment.campaign.reel.durationMs) {
      return NextResponse.json({ error: 'Completion threshold was not met' }, { status: 400 })
    }

    if (eventType === 'IMPRESSION') {
      const recentDeliveries = await prisma.videoRotationAssignment.count({
        where: {
          campaignId: token.campaignId,
          viewerHmac: { in: viewerHmacs },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      if (recentDeliveries > assignment.campaign.frequencyCap) {
        return NextResponse.json({ error: 'Campaign frequency cap was exceeded' }, { status: 409 })
      }
    }

    const now = new Date()
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const updateData = { [DAILY_METRIC_FIELD[eventType]]: { increment: 1 } }
    await prisma.$transaction(async (tx) => {
      await tx.videoCampaignEvent.create({
        data: {
          campaignId: token.campaignId,
          eventId: parsed.data.eventId,
          deliveryTokenId: token.id,
          eventType,
          viewerHmac: token.viewerHmac,
          occurredAt: now,
        },
      })
      await tx.videoCampaignDailyMetric.upsert({
        where: { campaignId_date: { campaignId: token.campaignId, date } },
        create: {
          campaignId: token.campaignId,
          date,
          [DAILY_METRIC_FIELD[eventType]]: 1,
        },
        update: updateData,
      })
    })

    return NextResponse.json({ accepted: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (isDuplicateError(error)) {
      return NextResponse.json({ accepted: true, duplicate: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Video campaign event ingestion failed', error)
    return NextResponse.json({ error: 'Unable to record video event' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
