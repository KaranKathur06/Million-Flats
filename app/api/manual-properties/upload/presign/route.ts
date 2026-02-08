import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { createSignedPutUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  propertyId: z.string().trim().min(1),
  category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']),
  filename: z.string().trim().min(1).max(160),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().min(1).max(60 * 1024 * 1024),
  altText: z.string().trim().max(200).optional(),
})

function safeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

function isAllowedImageType(mime: string) {
  return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp'
}

function isAllowedPdf(mime: string) {
  return mime === 'application/pdf'
}

function isAllowedVideoType(mime: string) {
  return mime === 'video/mp4' || mime === 'video/webm'
}

function folderForUpload(category: string, propertyId: string) {
  if (category === 'VIDEO') return `properties/videos/${propertyId}`
  if (category === 'BROCHURE') return `documents/${propertyId}`
  return `properties/images/${propertyId}`
}

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

    const { propertyId, category, filename, contentType, sizeBytes } = parsed.data

    const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId } })
    if (!property) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })
    }

    const isBrochure = category === 'BROCHURE'
    const isVideo = category === 'VIDEO'

    if (isBrochure) {
      if (!isAllowedPdf(contentType)) {
        return NextResponse.json({ success: false, message: 'Only PDF brochures are allowed.' }, { status: 400 })
      }
      if (sizeBytes > 15 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'PDF too large (max 15MB).' }, { status: 400 })
      }
    } else if (isVideo) {
      if (!isAllowedVideoType(contentType)) {
        return NextResponse.json({ success: false, message: 'Only MP4/WebM videos are allowed.' }, { status: 400 })
      }
      if (sizeBytes > 50 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Video too large (max 50MB).' }, { status: 400 })
      }
    } else {
      if (!isAllowedImageType(contentType)) {
        return NextResponse.json({ success: false, message: 'Only JPG/PNG/WebP images are allowed.' }, { status: 400 })
      }
      if (sizeBytes > 10 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Image too large (max 10MB).' }, { status: 400 })
      }
    }

    const safeName = safeFilename(filename) || 'upload'

    const signed = await createSignedPutUrl({
      folder: folderForUpload(category, propertyId),
      filename: safeName,
      contentType,
      expiresInSeconds: 600,
    })

    return NextResponse.json({
      success: true,
      uploadUrl: signed.uploadUrl,
      objectUrl: signed.objectUrl,
      key: signed.key,
      bucket: signed.bucket,
      region: signed.region,
      expiresIn: signed.expiresIn,
      category,
      contentType,
    })
  } catch (error) {
    console.error('Manual property upload presign: failed', error)
    return NextResponse.json({ success: false, message: 'Failed to prepare upload' }, { status: 500 })
  }
}
