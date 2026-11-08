import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'

export async function GET() {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video reels are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  }

  const reels = await prisma.videoReel.findMany({
    where: { ownerUserId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      caption: true,
      durationMs: true,
      moderationStatus: true,
      reviewedAt: true,
      rejectionReason: true,
      mediaVerifiedAt: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ reels }, { headers: { 'Cache-Control': 'no-store' } })
}
