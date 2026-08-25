import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentDraftSession } from '@/lib/agentAuth'
import { s3ObjectExists } from '@/lib/s3'
import { PROPERTY_MEDIA_MAX_IMAGE_BYTES } from '@/lib/propertyMedia'

export const runtime = 'nodejs'

const BodySchema = z.object({
  propertyId: z.string().trim().min(1),
  category: z.enum(['COVER', 'EXTERIOR', 'LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'VIEW', 'FLOOR_PLANS', 'AMENITIES', 'OTHER', 'BROCHURE', 'VIDEO']),
  url: z.string().trim().min(1),
  s3Key: z.string().trim().min(1),
  mimeType: z.string().trim().min(1).max(100).optional().nullable(),
  sizeBytes: z.number().int().min(1).max(Math.max(PROPERTY_MEDIA_MAX_IMAGE_BYTES, 500 * 1024 * 1024)).optional().nullable(),
  altText: z.string().trim().max(200).optional().nullable(),
  floorPlanTitle: z.string().trim().max(160).optional().nullable(),
  floorPlanBedroomCount: z.number().int().min(0).max(100).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAgentDraftSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
    }

    const { propertyId, category, url, s3Key, mimeType, sizeBytes, altText, floorPlanTitle, floorPlanBedroomCount } = parsed.data

    const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId } })
    if (!property) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })
    }

    if (!s3Key.startsWith(`public/properties/${propertyId}/`) && !s3Key.startsWith(`private/properties/${propertyId}/`)) {
      return NextResponse.json({ success: false, message: 'Storage key is not authorized for this property' }, { status: 403 })
    }

    const objectExists = await s3ObjectExists({ key: s3Key }).catch(() => false)
    if (!objectExists) {
      return NextResponse.json({ success: false, message: 'Uploaded object not found in storage' }, { status: 404 })
    }

    if (category === 'COVER') {
      await (prisma as any).manualPropertyMedia.updateMany({ where: { propertyId, category: 'COVER' }, data: { category: 'EXTERIOR' } })
    }

    const last = await (prisma as any).manualPropertyMedia.aggregate({ where: { propertyId }, _max: { position: true } })

    await (prisma as any).manualPropertyMedia.create({
      data: {
        propertyId,
        category: category as any,
        url,
        s3Key,
        mimeType: mimeType || null,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
        altText: altText || null,
        floorPlanTitle: category === 'FLOOR_PLANS' ? floorPlanTitle || null : null,
        floorPlanBedroomCount: category === 'FLOOR_PLANS' ? floorPlanBedroomCount ?? null : null,
        position: (last._max.position ?? -1) + 1,
      } as any,
    })

    const media = await (prisma as any).manualPropertyMedia.findMany({
      where: { propertyId },
      orderBy: [{ category: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, category: true, url: true, altText: true, position: true, mimeType: true, sizeBytes: true, createdAt: true },
    })

    return NextResponse.json({ success: true, media })
  } catch (error) {
    console.error('Manual property upload complete: failed', error)
    return NextResponse.json({ success: false, message: 'Failed to finalize upload' }, { status: 500 })
  }
}
