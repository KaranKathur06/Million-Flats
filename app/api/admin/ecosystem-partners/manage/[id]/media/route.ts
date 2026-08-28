import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import {
  buildEcosystemPartnerLogoKey,
  buildEcosystemPartnerCoverKey,
  uploadToS3Key,
  deleteFromS3,
  buildCdnAssetUrl,
} from '@/lib/s3'
import { auditPartnerMedia } from '@/lib/ecosystem/admin/auditPartner'
import { revalidatePartnerSurfaces } from '@/lib/ecosystem/revalidatePartner'

export const runtime = 'nodejs'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
])

const MAX_LOGO_SIZE = 2 * 1024 * 1024    // 2 MB
const MAX_COVER_SIZE = 10 * 1024 * 1024   // 10 MB

function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 4) return null
  const h = buffer.slice(0, 12)
  if (h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF) return 'image/jpeg'
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47) return 'image/png'
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50) return 'image/webp'
  const head = buffer.slice(0, 200).toString('utf-8', 0, 200)
  if (head.includes('<svg') || head.includes('<?xml')) return 'image/svg+xml'
  return null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const partner = await (prisma as any).ecosystemPartner.findUnique({
      where: { id: params.id },
      include: { category: { select: { slug: true } } },
    })
    if (!partner) {
      return NextResponse.json({ success: false, message: 'Partner not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mediaType = String(formData.get('type') || '').toUpperCase() as 'LOGO' | 'COVER'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }
    if (mediaType !== 'LOGO' && mediaType !== 'COVER') {
      return NextResponse.json({ success: false, message: 'Invalid media type. Must be LOGO or COVER.' }, { status: 400 })
    }

    // Read buffer and detect MIME from magic bytes — never trust client Content-Type
    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedMime = detectMimeFromBuffer(buffer)

    if (!detectedMime || !ALLOWED_IMAGE_TYPES.has(detectedMime)) {
      return NextResponse.json({
        success: false,
        message: `Invalid file type. Allowed: JPEG, PNG, WebP, SVG. Detected: ${detectedMime || 'unknown'}`,
      }, { status: 400 })
    }

    const maxSize = mediaType === 'LOGO' ? MAX_LOGO_SIZE : MAX_COVER_SIZE
    if (buffer.length > maxSize) {
      return NextResponse.json({
        success: false,
        message: `File too large. Max ${mediaType === 'LOGO' ? '2MB' : '10MB'} allowed.`,
      }, { status: 400 })
    }

    // Build S3 key
    const ext = detectedMime.split('/')[1] === 'svg+xml' ? 'svg' : detectedMime.split('/')[1]
    const s3Key = mediaType === 'LOGO'
      ? buildEcosystemPartnerLogoKey({ partnerId: params.id, ext, contentType: detectedMime })
      : buildEcosystemPartnerCoverKey({ partnerId: params.id, ext, contentType: detectedMime })

    // Delete previous media from S3 if exists
    const existingMedia = await (prisma as any).ecosystemPartnerMedia.findUnique({
      where: { partnerId_type: { partnerId: params.id, type: mediaType } },
    })
    if (existingMedia) {
      deleteFromS3(existingMedia.storageKey).catch(() => {})
    }

    // Upload to S3
    await uploadToS3Key({ buffer, key: s3Key, contentType: detectedMime })
    const publicUrl = buildCdnAssetUrl({ key: s3Key })

    // Upsert media record
    const media = await (prisma as any).ecosystemPartnerMedia.upsert({
      where: { partnerId_type: { partnerId: params.id, type: mediaType } },
      create: {
        partnerId: params.id,
        type: mediaType,
        storageKey: s3Key,
        publicUrl,
        mimeType: detectedMime,
        fileSize: buffer.length,
        altText: `${partner.name} ${mediaType.toLowerCase()}`,
      },
      update: {
        storageKey: s3Key,
        publicUrl,
        mimeType: detectedMime,
        fileSize: buffer.length,
      },
    })

    // Update backward-compatible string field on partner
    const fieldToUpdate = mediaType === 'LOGO' ? 'logo' : 'coverImage'
    await (prisma as any).ecosystemPartner.update({
      where: { id: params.id },
      data: { [fieldToUpdate]: publicUrl },
    })

    // Audit
    const auditAction = existingMedia
      ? 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_REPLACED' as const
      : 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_UPLOADED' as const
    auditPartnerMedia({
      partnerId: params.id,
      adminUserId: auth.userId,
      action: auditAction,
      mediaType,
      storageKey: s3Key,
      meta: { fileSize: buffer.length, mimeType: detectedMime },
    }).catch(() => {})

    revalidatePartnerSurfaces(partner.category.slug, partner.slug)

    return NextResponse.json({ success: true, data: media })
  } catch (e) {
    console.error('Ecosystem partner media upload error:', e)
    return NextResponse.json({ success: false, message: 'Media upload failed' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const mediaType = String(searchParams.get('type') || '').toUpperCase() as 'LOGO' | 'COVER'

    if (mediaType !== 'LOGO' && mediaType !== 'COVER') {
      return NextResponse.json({ success: false, message: 'Invalid media type. Must be LOGO or COVER.' }, { status: 400 })
    }

    const existing = await (prisma as any).ecosystemPartnerMedia.findUnique({
      where: { partnerId_type: { partnerId: params.id, type: mediaType } },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'No media found to delete' }, { status: 404 })
    }

    // Delete from S3
    deleteFromS3(existing.storageKey).catch(() => {})

    // Delete DB record
    await (prisma as any).ecosystemPartnerMedia.delete({
      where: { id: existing.id },
    })

    // Clear backward-compatible field
    const fieldToClear = mediaType === 'LOGO' ? 'logo' : 'coverImage'
    const partner = await (prisma as any).ecosystemPartner.update({
      where: { id: params.id },
      data: { [fieldToClear]: null },
      include: { category: { select: { slug: true } } },
    })

    // Audit
    auditPartnerMedia({
      partnerId: params.id,
      adminUserId: auth.userId,
      action: 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_DELETED',
      mediaType,
      storageKey: existing.storageKey,
    }).catch(() => {})

    revalidatePartnerSurfaces(partner.category.slug, partner.slug)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Ecosystem partner media delete error:', e)
    return NextResponse.json({ success: false, message: 'Media delete failed' }, { status: 500 })
  }
}
