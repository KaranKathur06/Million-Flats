import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3, extractS3KeyFromUrl, uploadToS3 } from '@/lib/s3'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  propertyId: z.string().trim().min(1),
  category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']),
})

const TypeSchema = z.enum(['cover', 'interior', 'exterior', 'floorplan', 'video', 'document', 'amenities', 'brochure'])

function typeToCategory(type: z.infer<typeof TypeSchema>) {
  if (type === 'cover') return 'COVER'
  if (type === 'interior') return 'INTERIOR'
  if (type === 'exterior') return 'EXTERIOR'
  if (type === 'floorplan') return 'FLOOR_PLANS'
  if (type === 'video') return 'VIDEO'
  if (type === 'amenities') return 'AMENITIES'
  if (type === 'brochure' || type === 'document') return 'BROCHURE'
  return 'INTERIOR'
}

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

    const { searchParams } = new URL(req.url)
    const legacyQuery = QuerySchema.safeParse({
      propertyId: searchParams.get('propertyId'),
      category: searchParams.get('category'),
    })

    const form = await req.formData()
    const file = form.get('file')
    const altText = typeof form.get('altText') === 'string' ? String(form.get('altText')).trim() : ''

    const typeRaw = typeof form.get('type') === 'string' ? String(form.get('type')).trim().toLowerCase() : ''
    const parsedType = typeRaw ? TypeSchema.safeParse(typeRaw) : null

    const propertyIdFromBody = typeof form.get('propertyId') === 'string' ? String(form.get('propertyId')).trim() : ''

    const propertyId = legacyQuery.success ? legacyQuery.data.propertyId : propertyIdFromBody
    const category = legacyQuery.success
      ? legacyQuery.data.category
      : parsedType?.success
        ? typeToCategory(parsedType.data)
        : null

    if (!propertyId || !category) {
      return NextResponse.json({ success: false, message: 'Missing propertyId or type' }, { status: 400 })
    }

    const property = await (prisma as any).manualProperty.findFirst({ where: { id: propertyId, agentId: auth.agentId } })
    if (!property) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') {
      return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })
    }

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
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Image too large (max 10MB).' }, { status: 400 })
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

  if (category === 'COVER') {
    const existingCovers = await (prisma as any).manualPropertyMedia.findMany({
      where: { propertyId, category: 'COVER' },
      select: { id: true, s3Key: true, url: true },
    })

    for (const row of existingCovers) {
      const key = row?.s3Key || extractS3KeyFromUrl(String(row?.url || ''))
      if (key) {
        await deleteFromS3(key).catch(() => null)
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
      s3Key: uploaded.key,
      mimeType: mime || null,
      sizeBytes: file.size || null,
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
    console.error('Manual property upload: failed', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}
