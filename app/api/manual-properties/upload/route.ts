import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { uploadToS3 } from '@/lib/s3'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  propertyId: z.string().trim().min(1),
  category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']),
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
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const parsedQuery = QuerySchema.safeParse({
    propertyId: searchParams.get('propertyId'),
    category: searchParams.get('category'),
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, message: 'Invalid query' }, { status: 400 })
  }

  const { propertyId, category } = parsedQuery.data

  const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId } })
  if (!property) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim() : ''

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, message: 'Missing file' }, { status: 400 })
  }

  const mime = file.type || ''
  const isBrochure = category === 'BROCHURE'
  const isVideo = category === 'VIDEO'

  if (isBrochure) {
    if (!isAllowedPdf(mime)) {
      return NextResponse.json({ success: false, message: 'Only PDF brochures are allowed.' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'PDF too large (max 15MB).' }, { status: 400 })
    }
  } else if (isVideo) {
    if (!isAllowedVideoType(mime)) {
      return NextResponse.json({ success: false, message: 'Only MP4/WebM videos are allowed.' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Video too large (max 50MB).' }, { status: 400 })
    }
  } else {
    if (!isAllowedImageType(mime)) {
      return NextResponse.json({ success: false, message: 'Only JPG/PNG/WebP images are allowed.' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Image too large (max 8MB).' }, { status: 400 })
    }
  }

  const ext = isBrochure
    ? 'pdf'
    : isVideo
      ? mime === 'video/webm'
        ? 'webm'
        : 'mp4'
      : mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
          ? 'webp'
          : 'jpg'

  const baseName = safeFilename(file.name || 'upload') || 'upload'
  const finalName = baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const uploaded = await uploadToS3({
    buffer: buf,
    folder: folderForUpload(category, propertyId),
    filename: finalName,
    contentType: mime || 'application/octet-stream',
  })

  const url = uploaded.objectUrl

  const media = await (prisma as any).manualPropertyMedia.create({
    data: {
      propertyId,
      category: category as any,
      url,
      altText: altText || null,
      position: 0,
    } as any,
    select: { id: true, category: true, url: true, altText: true, position: true },
  })

  return NextResponse.json({ success: true, media })
}
