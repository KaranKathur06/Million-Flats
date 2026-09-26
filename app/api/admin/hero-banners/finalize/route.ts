import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { verifyStoredHeroImage } from '@/lib/heroBannerMedia'
import { revalidateHeroBannerSurfaces } from '@/lib/heroBanners'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    bannerId: z.string().trim().min(1),
    slot: z.enum(['desktop', 'mobile']),
    s3Key: z.string().trim().startsWith('public/hero-banners/'),
    contentType: z.string().trim().min(1),
    fileSizeBytes: z.number().int().positive().max(15 * 1024 * 1024),
    altText: z.string().trim().max(300).optional().default(''),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid uploaded image details.' }, { status: 400 })

  try {
    const db = prisma as any
    const banner = await db.heroBanner.findUnique({ where: { id: parsed.data.bannerId } })
    if (!banner) return NextResponse.json({ success: false, message: 'Hero banner not found.' }, { status: 404 })
    const verified = await verifyStoredHeroImage({
      key: parsed.data.s3Key,
      expectedType: parsed.data.contentType,
      expectedSize: parsed.data.fileSizeBytes,
      uploadedBy: auth.userId,
      bannerId: banner.id,
    })
    const prefix = `public/hero-banners/${banner.scopeKey.replace(/[^a-zA-Z0-9-]+/g, '-')}/${banner.category.toLowerCase()}/${parsed.data.slot}-`
    if (!parsed.data.s3Key.startsWith(prefix)) return NextResponse.json({ success: false, message: 'Image key does not belong to this banner and slot.' }, { status: 400 })

    const slot = parsed.data.slot
    const updated = await db.heroBanner.update({
      where: { id: banner.id },
      data: {
        [`${slot}ImageKey`]: parsed.data.s3Key,
        [`${slot}ImageUrl`]: verified.imageUrl,
        [`${slot}ImageAlt`]: parsed.data.altText || banner[`${slot}ImageAlt`] || '',
        [`${slot}Width`]: verified.width,
        [`${slot}Height`]: verified.height,
        [`${slot}FileSize`]: verified.fileSize,
        [`${slot}MimeType`]: verified.mimeType,
        updatedBy: auth.userId,
      },
      include: { city: true },
    })
    await writeAuditLog({
      entityType: 'HERO_BANNER',
      entityId: banner.id,
      action: 'ADMIN_HERO_BANNER_UPDATED',
      performedByUserId: auth.userId,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'),
      beforeState: { slot, key: banner[`${slot}ImageKey`] },
      afterState: { slot, key: parsed.data.s3Key, width: verified.width, height: verified.height, fileSize: verified.fileSize, mimeType: verified.mimeType },
    })
    revalidateHeroBannerSurfaces(banner.scopeKey, banner.category)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[admin-hero-banners] finalize failed', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Could not verify and save the uploaded image.' }, { status: 400 })
  }
}