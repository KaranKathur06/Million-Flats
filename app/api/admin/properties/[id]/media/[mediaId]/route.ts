import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { deleteFromS3 } from '@/lib/s3'
import { isPropertyMediaCategory, propertyMediaCategory, propertyMediaStorageCategory } from '@/lib/propertyMedia'

async function findOwnedMedia(propertyId: string, mediaId: string) {
  const media = await (prisma as any).manualPropertyMedia.findUnique({ where: { id: mediaId } })
  return media?.propertyId === propertyId ? media : null
}

export async function PATCH(req: Request, { params }: { params: { id: string; mediaId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const media = await findOwnedMedia(params.id, params.mediaId)
  if (!media) return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 })
  const body = z.object({ category: z.string().optional(), altText: z.string().max(200).nullable().optional(), position: z.number().int().min(0).optional() }).safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ success: false, message: 'Invalid media update' }, { status: 400 })
  const update: any = {}
  if (body.data.category !== undefined) {
    if (!isPropertyMediaCategory(body.data.category)) return NextResponse.json({ success: false, message: 'Invalid media category' }, { status: 400 })
    const category = propertyMediaStorageCategory(body.data.category)
    if (category === 'COVER') await (prisma as any).manualPropertyMedia.updateMany({ where: { propertyId: params.id, category: 'COVER', id: { not: media.id } }, data: { category: 'EXTERIOR' } })
    update.category = category
  }
  if (body.data.altText !== undefined) update.altText = body.data.altText
  if (body.data.position !== undefined) update.position = body.data.position
  const updated = await (prisma as any).manualPropertyMedia.update({ where: { id: media.id }, data: update })
  return NextResponse.json({ success: true, media: { ...updated, category: propertyMediaCategory(updated.category) } })
}

export async function DELETE(_req: Request, { params }: { params: { id: string; mediaId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const media = await findOwnedMedia(params.id, params.mediaId)
  if (!media) return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 })
  if (media.s3Key) await deleteFromS3(media.s3Key).catch((err) => console.error('[property media delete] storage cleanup failed', err))
  await (prisma as any).manualPropertyMedia.delete({ where: { id: media.id } })
  return NextResponse.json({ success: true })
}
