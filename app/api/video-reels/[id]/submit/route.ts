import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video reels are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  }

  const submitted = await prisma.videoReel.updateMany({
    where: {
      id: params.id,
      ownerUserId: auth.user.id,
      moderationStatus: 'DRAFT',
      mediaVerifiedAt: { not: null },
      mediaDeletedAt: null,
    },
    data: { moderationStatus: 'PENDING_REVIEW' },
  })
  if (submitted.count !== 1) {
    return NextResponse.json({ error: 'A verified draft video is required before submission' }, { status: 409 })
  }

  return NextResponse.json({ success: true, status: 'PENDING_REVIEW' }, { headers: { 'Cache-Control': 'no-store' } })
}
