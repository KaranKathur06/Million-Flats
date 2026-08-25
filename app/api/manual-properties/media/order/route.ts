import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentDraftSession } from '@/lib/agentAuth'

const BodySchema = z.object({
  propertyId: z.string().trim().min(1),
  mediaIds: z.array(z.string().trim().min(1)).min(1).max(500),
})

export async function PATCH(req: Request) {
  const auth = await requireAgentDraftSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid media order' }, { status: 400 })

  const { propertyId, mediaIds } = parsed.data
  const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId }, select: { id: true, status: true } })
  if (!property) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  if (property.status !== 'DRAFT' && property.status !== 'REJECTED') return NextResponse.json({ success: false, message: 'Cannot edit media after submission' }, { status: 400 })

  const media = await (prisma as any).manualPropertyMedia.findMany({ where: { propertyId }, select: { id: true } })
  const ownedIds = new Set(media.map((item: { id: string }) => item.id))
  if (mediaIds.length !== ownedIds.size || mediaIds.some((id) => !ownedIds.has(id))) {
    return NextResponse.json({ success: false, message: 'Media order does not match this property' }, { status: 400 })
  }

  await (prisma as any).$transaction(mediaIds.map((id, position) => (prisma as any).manualPropertyMedia.update({ where: { id }, data: { position } })))
  const updated = await (prisma as any).manualPropertyMedia.findMany({ where: { propertyId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json({ success: true, media: updated })
}
