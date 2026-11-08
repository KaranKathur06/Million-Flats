import { NextResponse } from 'next/server'
import { VideoReelModerationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const requestedStatus = new URL(request.url).searchParams.get('status') || 'PENDING_REVIEW'
  if (!Object.values(VideoReelModerationStatus).includes(requestedStatus as VideoReelModerationStatus)) {
    return NextResponse.json({ error: 'Invalid reel moderation status' }, { status: 400 })
  }

  try {
    const reels = await prisma.videoReel.findMany({
      where: { moderationStatus: requestedStatus as VideoReelModerationStatus },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        caption: true,
        durationMs: true,
        mediaMimeType: true,
        mediaSizeBytes: true,
        mediaVerifiedAt: true,
        moderationStatus: true,
        reviewedAt: true,
        rejectionReason: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, slug: true, name: true } },
      },
    })
    return NextResponse.json({ reels }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Admin video reel queue failed to load', error)
    return NextResponse.json({ error: 'Unable to load the video review queue' }, { status: 503 })
  }
}
