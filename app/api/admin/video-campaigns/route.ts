import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSignedGetUrl } from '@/lib/s3'
import { requireAdminSession } from '@/lib/adminAuth'
import { getConfiguredVideoCampaignTaxRateBps } from '@/lib/videoReels/config'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const [reels, campaigns, settings, packages] = await Promise.all([
      prisma.videoReel.findMany({
        where: { moderationStatus: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
          project: { select: { id: true, slug: true, name: true } },
        },
      }),
      prisma.videoCampaign.findMany({
        where: { status: { in: ['PENDING_REVIEW', 'APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] } },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 200,
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
          reel: { select: { id: true, title: true, mediaObjectKey: true } },
          order: { select: { status: true, amount: true, taxAmount: true, totalAmount: true, currency: true, paidAt: true } },
        },
      }),
      prisma.videoCampaignSettings.findUnique({ where: { id: 'global' } }),
      prisma.videoCampaignPackage.findMany({ orderBy: [{ isActive: 'desc' }, { amount: 'asc' }] }),
    ])

    const reelsWithUrls = await Promise.all(reels.map(async (reel) => {
      const media = await createSignedGetUrl({ key: reel.mediaObjectKey, expiresInSeconds: 300 })
      return {
        id: reel.id,
        owner: reel.owner,
        project: reel.project,
        title: reel.title,
        caption: reel.caption,
        mediaUrl: media.url,
        mediaMimeType: reel.mediaMimeType,
        mediaSizeBytes: reel.mediaSizeBytes,
        durationMs: reel.durationMs,
        createdAt: reel.createdAt,
      }
    }))

    return NextResponse.json({
      reels: reelsWithUrls,
      campaigns: campaigns.map(({ reel, ...campaign }) => ({
        ...campaign,
        reel: { id: reel.id, title: reel.title },
      })),
      settings,
      packages,
      configuredTaxRateBps: getConfiguredVideoCampaignTaxRateBps(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin video campaigns could not be loaded', error)
    return NextResponse.json({ error: 'Unable to load video campaign management' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
