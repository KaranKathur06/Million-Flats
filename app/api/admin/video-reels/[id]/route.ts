import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSignedGetUrl } from '@/lib/s3'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeVideoAudit } from '@/lib/videoReels/audit'

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'archive']),
  reason: z.string().trim().max(500).optional(),
}).strict()

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const reel = await prisma.videoReel.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, slug: true, name: true, status: true } },
    },
  })
  if (!reel) return NextResponse.json({ error: 'Video reel not found' }, { status: 404 })

  const media = reel.mediaDeletedAt
    ? null
    : await createSignedGetUrl({ key: reel.mediaObjectKey, expiresInSeconds: 300 })
  return NextResponse.json({
    reel: {
      id: reel.id,
      owner: reel.owner,
      project: reel.project,
      title: reel.title,
      caption: reel.caption,
      mediaUrl: media?.url || null,
      mediaMimeType: reel.mediaMimeType,
      mediaSizeBytes: reel.mediaSizeBytes,
      durationMs: reel.durationMs,
      moderationStatus: reel.moderationStatus,
      reviewedAt: reel.reviewedAt,
      rejectionReason: reel.rejectionReason,
      createdAt: reel.createdAt,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid moderation action' }, { status: 400 })
  if (parsed.data.action === 'reject' && !parsed.data.reason) {
    return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const reel = await tx.videoReel.findUnique({ where: { id: params.id } })
      if (!reel) throw new Error('REEL_NOT_FOUND')
      if (parsed.data.action === 'archive') {
        if (reel.moderationStatus === 'ARCHIVED') throw new Error('REEL_ALREADY_ARCHIVED')
        const affectedCampaigns = await tx.videoCampaign.findMany({
          where: {
            reelId: reel.id,
            status: { in: ['APPROVED_AWAITING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'PAUSED'] },
          },
          select: { id: true, status: true },
        })
        if (affectedCampaigns.length) {
          await tx.videoCampaign.updateMany({
            where: { id: { in: affectedCampaigns.map((campaign) => campaign.id) } },
            data: { status: 'PAUSED' },
          })
          for (const campaign of affectedCampaigns) {
            await writeVideoAudit(tx, {
              actorUserId: auth.userId,
              entityType: 'CAMPAIGN',
              entityId: campaign.id,
              action: 'CAMPAIGN_PAUSED_FOR_REEL_ARCHIVE',
              beforeState: { status: campaign.status },
              afterState: { status: 'PAUSED' },
            })
          }
        }
      } else if (reel.moderationStatus !== 'PENDING_REVIEW') {
        throw new Error('REEL_NOT_PENDING')
      }
      if (parsed.data.action === 'approve' && (!reel.mediaVerifiedAt || reel.mediaDeletedAt)) throw new Error('REEL_MEDIA_UNVERIFIED')

      const nextStatus = parsed.data.action === 'approve'
        ? 'APPROVED'
        : parsed.data.action === 'reject'
          ? 'REJECTED'
          : 'ARCHIVED'
      const next = await tx.videoReel.update({
        where: { id: reel.id },
        data: {
          moderationStatus: nextStatus,
          reviewerUserId: auth.userId,
          reviewedAt: new Date(),
          rejectionReason: parsed.data.action === 'reject' ? parsed.data.reason : null,
          archivedAt: parsed.data.action === 'archive' ? new Date() : null,
        },
        select: { id: true, moderationStatus: true, reviewedAt: true },
      })
      await writeVideoAudit(tx, {
        actorUserId: auth.userId,
        entityType: 'REEL',
        entityId: reel.id,
        action: `REEL_${parsed.data.action.toUpperCase()}`,
        beforeState: { moderationStatus: reel.moderationStatus },
        afterState: { moderationStatus: next.moderationStatus, reason: parsed.data.reason || null },
      })
      return next
    })
    return NextResponse.json({ reel: updated }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'REEL_NOT_FOUND') return NextResponse.json({ error: 'Video reel not found' }, { status: 404 })
      if (error.message === 'REEL_NOT_PENDING') return NextResponse.json({ error: 'Video reel is not awaiting review' }, { status: 409 })
      if (error.message === 'REEL_ALREADY_ARCHIVED') return NextResponse.json({ error: 'Video reel is already archived' }, { status: 409 })
      if (error.message === 'REEL_MEDIA_UNVERIFIED') return NextResponse.json({ error: 'Media must pass server verification before approval' }, { status: 409 })
    }
    console.error('Video reel moderation failed', error)
    return NextResponse.json({ error: 'Unable to moderate video reel' }, { status: 500 })
  }
}
