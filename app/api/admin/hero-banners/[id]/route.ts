import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getS3Client } from '@/lib/s3'
import { writeAuditLog } from '@/lib/audit'
import { revalidateHeroBannerSurfaces } from '@/lib/heroBanners'

export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).max(1000).optional(),
    removeSlot: z.enum(['desktop', 'mobile']).optional(),
  }).safeParse(body)
  if (!parsed.success || (!parsed.data.isActive && parsed.data.isActive !== false && parsed.data.priority === undefined && !parsed.data.removeSlot)) {
    return NextResponse.json({ success: false, message: 'No valid banner changes were provided.' }, { status: 400 })
  }

  const db = prisma as any
  try {
    const current = await db.heroBanner.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ success: false, message: 'Hero banner not found.' }, { status: 404 })
    const imageSlot = parsed.data.removeSlot
    const nextDesktopImage = imageSlot === 'desktop' ? null : current.desktopImageKey
    const nextIsActive = parsed.data.isActive ?? current.isActive
    const allowsImageFreeProject = current.scope === 'GLOBAL' && current.category === 'PROJECTS'
    if (nextIsActive && !nextDesktopImage && !allowsImageFreeProject) {
      return NextResponse.json({ success: false, message: 'Add a desktop image before activating this banner.' }, { status: 400 })
    }

    const data: Record<string, unknown> = { updatedBy: auth.userId }
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority
    if (imageSlot) {
      Object.assign(data, {
        [`${imageSlot}ImageKey`]: null,
        [`${imageSlot}ImageUrl`]: null,
        [`${imageSlot}ImageAlt`]: null,
        [`${imageSlot}Width`]: null,
        [`${imageSlot}Height`]: null,
        [`${imageSlot}FileSize`]: null,
        [`${imageSlot}MimeType`]: null,
      })
    }

    const updated = await db.heroBanner.update({ where: { id: current.id }, data, include: { city: true } })
    if (imageSlot) {
      const oldKey = current[`${imageSlot}ImageKey`]
      if (oldKey) {
        try {
          await getS3Client().send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: oldKey }))
        } catch (error) {
          console.error('[admin-hero-banners] old image delete failed', { bannerId: current.id, slot: imageSlot, error })
        }
      }
    }

    const action = imageSlot
      ? 'ADMIN_HERO_BANNER_IMAGE_REMOVED'
      : parsed.data.isActive !== undefined && parsed.data.isActive !== current.isActive
        ? 'ADMIN_HERO_BANNER_STATUS_CHANGED'
        : 'ADMIN_HERO_BANNER_UPDATED'
    await writeAuditLog({
      entityType: 'HERO_BANNER',
      entityId: current.id,
      action,
      performedByUserId: auth.userId,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'),
      beforeState: { isActive: current.isActive, priority: current.priority, removedImageKey: imageSlot ? current[`${imageSlot}ImageKey`] : undefined },
      afterState: { isActive: updated.isActive, priority: updated.priority, removedSlot: imageSlot },
    })
    revalidateHeroBannerSurfaces(current.scopeKey, current.category)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[admin-hero-banners] update failed', error)
    return NextResponse.json({ success: false, message: 'Could not update hero banner.' }, { status: 500 })
  }
}

