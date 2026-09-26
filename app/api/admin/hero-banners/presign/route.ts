import { NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getS3Client } from '@/lib/s3'
import { buildHeroBannerImageKey, HERO_BANNER_IMAGE_TYPES, HERO_BANNER_MAX_BYTES, normalizeHeroImageType } from '@/lib/heroBannerMedia'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    bannerId: z.string().trim().min(1),
    slot: z.enum(['desktop', 'mobile']),
    contentType: z.string().trim().min(1),
    fileSizeBytes: z.number().int().positive().max(HERO_BANNER_MAX_BYTES),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid upload request.' }, { status: 400 })

  const contentType = normalizeHeroImageType(parsed.data.contentType)
  if (!HERO_BANNER_IMAGE_TYPES.includes(contentType as (typeof HERO_BANNER_IMAGE_TYPES)[number])) {
    return NextResponse.json({ success: false, message: 'Only JPEG, PNG, WebP, and AVIF images are supported.' }, { status: 400 })
  }

  try {
    const banner = await (prisma as any).heroBanner.findUnique({ where: { id: parsed.data.bannerId }, select: { id: true, scopeKey: true, category: true } })
    if (!banner) return NextResponse.json({ success: false, message: 'Save the banner configuration before uploading images.' }, { status: 404 })
    const s3Key = buildHeroBannerImageKey(banner.scopeKey, banner.category, parsed.data.slot, contentType)
    const uploadUrl = await getSignedUrl(getS3Client(), new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: parsed.data.fileSizeBytes,
      Metadata: { 'uploaded-by': auth.userId, 'hero-banner-id': banner.id },
    }), { expiresIn: 600 })
    return NextResponse.json({ success: true, uploadUrl, s3Key, expiresIn: 600 })
  } catch (error) {
    console.error('[admin-hero-banners] presign failed', error)
    return NextResponse.json({ success: false, message: 'Could not prepare the image upload.' }, { status: 500 })
  }
}