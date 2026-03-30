import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildPublicAssetUrl, createSignedPutUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  filename: z.string().trim().min(1).max(160),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
})

function safeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

function isAllowedImageType(mime: string) {
  return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp' || mime === 'image/avif'
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid upload request' }, { status: 400 })
    }

    const { filename, contentType, sizeBytes } = parsed.data

    if (!isAllowedImageType(contentType)) {
      return NextResponse.json({ success: false, message: 'Only JPG, PNG, WebP, and AVIF images are allowed.' }, { status: 400 })
    }

    if (sizeBytes > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Image too large (max 5MB).' }, { status: 400 })
    }

    const signed = await createSignedPutUrl({
      folder: 'public/blogs/images',
      filename: safeFilename(filename) || 'upload',
      contentType,
      expiresInSeconds: 600,
    })

    const publicUrl = buildPublicAssetUrl({ key: signed.key })

    return NextResponse.json({
      success: true,
      uploadUrl: signed.uploadUrl,
      objectUrl: signed.objectUrl,
      publicUrl,
      key: signed.key,
      expiresIn: signed.expiresIn,
      contentType,
    })
  } catch (error) {
    console.error('[POST /api/admin/blogs/upload/presign] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to prepare upload' }, { status: 500 })
  }
}

