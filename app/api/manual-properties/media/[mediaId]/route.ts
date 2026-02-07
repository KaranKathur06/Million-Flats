import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3, extractS3KeyFromUrl } from '@/lib/s3'

export const runtime = 'nodejs'

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

  const updatedMedia = await (prisma as any).manualPropertyMedia.findMany({
    where: { propertyId: media.propertyId },
    orderBy: [{ category: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, category: true, url: true, altText: true, position: true, mimeType: true, sizeBytes: true, createdAt: true },
  })

  return NextResponse.json({ success: true, media: updatedMedia })
}
