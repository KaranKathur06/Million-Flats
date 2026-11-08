import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'
import { consumeVideoRateLimit } from '@/lib/videoReels/rateLimit'
import { CampaignDestinationSchema } from '@/lib/videoReels/campaigns'

const CampaignRequestSchema = z.object({
  reelId: z.string().uuid(),
  packageId: z.string().uuid(),
  requestedStartAt: z.string().datetime().optional(),
  destination: CampaignDestinationSchema.optional(),
}).strict()

export async function GET() {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video campaigns are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })

  const campaigns = await prisma.videoCampaign.findMany({
    where: { ownerUserId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      reel: { select: { id: true, title: true, durationMs: true } },
      order: { select: { status: true, amount: true, taxAmount: true, totalAmount: true, currency: true, paidAt: true } },
      dailyMetrics: {
        select: {
          impressions: true,
          starts: true,
          qualifiedViews: true,
          completions: true,
          clicks: true,
          engagements: true,
        },
      },
    },
  })

  return NextResponse.json({
    campaigns: campaigns.map(({ dailyMetrics, ...campaign }) => {
      const totals = dailyMetrics.reduce((acc, day) => ({
        impressions: acc.impressions + day.impressions,
        starts: acc.starts + day.starts,
        qualifiedViews: acc.qualifiedViews + day.qualifiedViews,
        completions: acc.completions + day.completions,
        clicks: acc.clicks + day.clicks,
        engagements: acc.engagements + day.engagements,
      }), { impressions: 0, starts: 0, qualifiedViews: 0, completions: 0, clicks: 0, engagements: 0 })
      return {
        ...campaign,
        metrics: {
          ...totals,
          ctr: totals.impressions ? totals.clicks / totals.impressions : null,
          completionRate: totals.starts ? totals.completions / totals.starts : null,
        },
      }
    }),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video campaigns are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })

  const parsed = CampaignRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign request' }, { status: 400 })

  try {
    const rate = await consumeVideoRateLimit(`campaign:${auth.user.id}`, 10, 60 * 60)
    if (!rate.allowed) return NextResponse.json({ error: 'Campaign request limit reached' }, { status: 429 })

    const [reel, campaignPackage, settings] = await Promise.all([
      prisma.videoReel.findFirst({
        where: {
          id: parsed.data.reelId,
          ownerUserId: auth.user.id,
          moderationStatus: 'APPROVED',
          mediaVerifiedAt: { not: null },
          mediaDeletedAt: null,
        },
        select: { id: true },
      }),
      prisma.videoCampaignPackage.findFirst({
        where: { id: parsed.data.packageId, isActive: true },
      }),
      prisma.videoCampaignSettings.findUnique({ where: { id: 'global' } }),
    ])
    if (!reel) return NextResponse.json({ error: 'An approved video reel is required' }, { status: 400 })
    if (!campaignPackage) return NextResponse.json({ error: 'Campaign package is unavailable' }, { status: 400 })

    const now = new Date()
    const requestedStartAt = parsed.data.requestedStartAt ? new Date(parsed.data.requestedStartAt) : now
    const maxHorizonDays = settings?.schedulingHorizonDays ?? 90
    const maxStartAt = new Date(now.getTime() + maxHorizonDays * 24 * 60 * 60 * 1000)
    if (requestedStartAt < now || requestedStartAt > maxStartAt) {
      return NextResponse.json({ error: 'Requested start date is outside the scheduling window' }, { status: 400 })
    }

    const snapshot = {
      packageId: campaignPackage.id,
      packageVersion: campaignPackage.version,
      name: campaignPackage.name,
      durationDays: campaignPackage.durationDays,
      allocationBps: campaignPackage.allocationBps,
      amount: campaignPackage.amount,
      taxRateBps: campaignPackage.taxRateBps,
      currency: campaignPackage.currency,
      dailyImpressionCap: campaignPackage.dailyImpressionCap,
      totalImpressionCap: campaignPackage.totalImpressionCap,
      frequencyCap: campaignPackage.frequencyCap,
    } satisfies Prisma.InputJsonObject

    const campaign = await prisma.videoCampaign.create({
      data: {
        ownerUserId: auth.user.id,
        createdByUserId: auth.user.id,
        reelId: reel.id,
        packageId: campaignPackage.id,
        packageSnapshot: snapshot,
        status: 'PENDING_REVIEW',
        requestedStartAt,
        allocationBps: campaignPackage.allocationBps,
        dailyImpressionCap: campaignPackage.dailyImpressionCap,
        totalImpressionCap: campaignPackage.totalImpressionCap,
        frequencyCap: settings?.defaultFrequencyCap ?? campaignPackage.frequencyCap,
        requestedDestination: parsed.data.destination,
      },
      select: { id: true, status: true, createdAt: true },
    })
    return NextResponse.json({ campaign }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Video campaign request failed', error)
    return NextResponse.json({ error: 'Unable to submit the campaign request' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
