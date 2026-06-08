import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3 } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  propertyId: z.string().trim().min(1),
  category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']),
  url: z.string().trim().min(1),
  s3Key: z.string().trim().min(1),
  mimeType: z.string().trim().min(1).max(100).optional().nullable(),
  sizeBytes: z.number().int().min(1).max(60 * 1024 * 1024).optional().nullable(),
  altText: z.string().trim().max(200).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
    }

    const { propertyId, category, url, s3Key, mimeType, sizeBytes, altText } = parsed.data

    const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId } })
    if (!property) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })
    }

    if (category === 'COVER') {
      const existingCovers = await (prisma as any).manualPropertyMedia.findMany({
        where: { propertyId, category: 'COVER' },
        select: { id: true, s3Key: true },
      })

      for (const row of existingCovers) {
        if (row?.s3Key) {
          await deleteFromS3(String(row.s3Key)).catch(() => null)
        }
      }

      if (existingCovers.length > 0) {
        await (prisma as any).manualPropertyMedia.deleteMany({ where: { propertyId, category: 'COVER' } })
      }
    }

    await (prisma as any).manualPropertyMedia.create({
      data: {
        propertyId,
        category: category as any,
        url,
        s3Key,
        mimeType: mimeType || null,
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : null,
        altText: altText || null,
        position: 0,
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
