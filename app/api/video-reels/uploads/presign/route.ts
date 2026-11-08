import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSignedPutUrlForKey } from '@/lib/s3'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoReelsEnabled } from '@/lib/videoReels/config'
import { consumeVideoRateLimit } from '@/lib/videoReels/rateLimit'
import { parseBoundedPositiveInt } from '@/lib/videoReels/config'

export const runtime = 'nodejs'

const BodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().max(2000).optional(),
  contentType: z.enum(['video/mp4', 'video/webm']),
  sizeBytes: z.number().int().positive(),
  projectId: z.string().uuid().optional(),
}).strict()

const EXTENSIONS = { 'video/mp4': 'mp4', 'video/webm': 'webm' } as const

export async function POST(request: Request) {
  if (!isVideoReelsEnabled()) {
    return NextResponse.json({ error: 'Video reels are not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const body = BodySchema.safeParse(await request.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid upload details' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }

    const maxSizeBytes = parseBoundedPositiveInt(
      process.env.VIDEO_REEL_MAX_SIZE_BYTES,
      100 * 1024 * 1024,
      500 * 1024 * 1024,
    )
    if (body.data.sizeBytes > maxSizeBytes) {
      return NextResponse.json({ error: `Video exceeds the ${Math.floor(maxSizeBytes / 1024 / 1024)} MiB limit` }, { status: 400 })
    }
    if (body.data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: body.data.projectId, status: 'PUBLISHED', isDeleted: false, archivedAt: null },
        select: { id: true },
      })
      if (!project) {
        return NextResponse.json({ error: 'Linked project is not publicly available' }, { status: 400 })
      }
    }

    const rate = await consumeVideoRateLimit(`upload:${auth.user.id}`, 10, 60 * 60)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Upload limit reached. Try again later.' }, { status: 429 })
    }

    const id = crypto.randomUUID()
    const key = `private/video-reels/${auth.user.id}/${id}/${crypto.randomUUID()}.${EXTENSIONS[body.data.contentType]}`
    const reel = await prisma.videoReel.create({
      data: {
        id,
        ownerUserId: auth.user.id,
        projectId: body.data.projectId,
        title: body.data.title,
        caption: body.data.caption,
        mediaObjectKey: key,
        mediaMimeType: body.data.contentType,
        mediaSizeBytes: body.data.sizeBytes,
        durationMs: 1,
      },
      select: { id: true },
    })

    const signed = await createSignedPutUrlForKey({
      key,
      contentType: body.data.contentType,
      cacheControl: 'private, no-store',
      expiresInSeconds: 600,
    })

    return NextResponse.json({
      reelId: reel.id,
      uploadUrl: signed.uploadUrl,
      objectKey: key,
      expiresInSeconds: signed.expiresIn,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Video reel upload preparation failed', error)
    return NextResponse.json({ error: 'Unable to prepare the video upload' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
