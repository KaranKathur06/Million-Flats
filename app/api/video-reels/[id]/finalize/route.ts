import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'
import { inspectVideoObject, VideoMediaError } from '@/lib/videoReels/media'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video reels are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  }

  const reel = await prisma.videoReel.findFirst({
    where: { id: params.id, ownerUserId: auth.user.id },
    select: {
      id: true,
      mediaObjectKey: true,
      mediaMimeType: true,
      mediaSizeBytes: true,
      mediaVerifiedAt: true,
      moderationStatus: true,
      mediaDeletedAt: true,
    },
  })
  if (!reel) return NextResponse.json({ error: 'Video reel not found' }, { status: 404 })
  if (reel.moderationStatus !== 'DRAFT' || reel.mediaVerifiedAt) {
    return NextResponse.json({ error: 'This video reel cannot be finalized' }, { status: 409 })
  }
  if (reel.mediaDeletedAt) return NextResponse.json({ error: 'The uploaded video has expired and cannot be finalized' }, { status: 410 })
  if (!reel.mediaObjectKey.startsWith(`private/video-reels/${auth.user.id}/`)) {
    return NextResponse.json({ error: 'Upload ownership could not be verified' }, { status: 403 })
  }

  try {
    const inspected = await inspectVideoObject({
      key: reel.mediaObjectKey,
      expectedContentType: reel.mediaMimeType as 'video/mp4' | 'video/webm',
      expectedSizeBytes: reel.mediaSizeBytes,
    })
    const updated = await prisma.videoReel.updateMany({
      where: { id: reel.id, moderationStatus: 'DRAFT', mediaVerifiedAt: null, mediaDeletedAt: null },
      data: { durationMs: inspected.durationMs, mediaVerifiedAt: new Date() },
    })
    if (updated.count !== 1) return NextResponse.json({ error: 'The video upload expired during verification' }, { status: 410 })
    return NextResponse.json({ success: true, durationMs: inspected.durationMs }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof VideoMediaError) {
      const status = error.code === 'INVALID_MEDIA' ? 400 : 503
      if (error.code !== 'INVALID_MEDIA') console.error('Video reel media verification is unavailable', error.code)
      return NextResponse.json({ error: error.message }, { status, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Video reel media verification failed', error)
    return NextResponse.json({ error: 'Unable to verify uploaded media' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
