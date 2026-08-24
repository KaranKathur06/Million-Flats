import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3, extractS3KeyFromUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const UpdateSchema = z.object({
  category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']).optional(),
  position: z.number().int().min(0).max(10000).optional(),
})

async function ownedMedia(mediaId: string, agentId: string) {
  return (prisma as any).manualPropertyMedia.findFirst({
    where: { id: mediaId },
    select: { id: true, url: true, s3Key: true, propertyId: true, category: true, position: true, property: { select: { agentId: true, status: true } } },
  }).then((media: any) => media && media.property?.agentId === agentId ? media : null)
}

async function listMedia(propertyId: string) {
  return (prisma as any).manualPropertyMedia.findMany({
    where: { propertyId },
    orderBy: [{ category: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, category: true, url: true, altText: true, position: true, mimeType: true, sizeBytes: true, createdAt: true },
  })
}

export async function PATCH(req: Request, { params }: { params: { mediaId: string } }) {
  const auth = await requireAgentSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || (parsed.data.category === undefined && parsed.data.position === undefined)) {
    return NextResponse.json({ success: false, message: 'A media category or position is required' }, { status: 400 })
  }

  const media = await ownedMedia(params.mediaId, auth.agentId)
  if (!media) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  if (media.property.status !== 'DRAFT' && media.property.status !== 'REJECTED') {
    return NextResponse.json({ success: false, message: 'Cannot edit media after submission' }, { status: 400 })
  }

  if (parsed.data.category === 'COVER') {
    await (prisma as any).manualPropertyMedia.updateMany({
      where: { propertyId: media.propertyId, category: 'COVER', id: { not: media.id } },
      data: { category: 'EXTERIOR' },
    })
  }

  await (prisma as any).manualPropertyMedia.update({ where: { id: media.id }, data: parsed.data as any })
  return NextResponse.json({ success: true, media: await listMedia(media.propertyId) })
}

export async function DELETE(_req: Request, { params }: { params: { mediaId: string } }) {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const media = await (prisma as any).manualPropertyMedia.findFirst({
    where: { id: params.mediaId },
    select: { id: true, url: true, s3Key: true, propertyId: true, property: { select: { agentId: true } } },
  })

  if (!media || !media.property || media.property.agentId !== auth.agentId) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  const key = media.s3Key || extractS3KeyFromUrl(String(media.url || ''))
  if (key) {
    await deleteFromS3(key).catch(() => null)
  }

  await (prisma as any).manualPropertyMedia.delete({ where: { id: media.id } })

  const updatedMedia = await listMedia(media.propertyId)

  return NextResponse.json({ success: true, media: updatedMedia })
}
