import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { revalidateEcosystemBannerSurfaces, safeOriginalName, verifyStoredBanner } from '@/lib/ecosystem/banner'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const categoryId = String(body?.categoryId || '').trim()
  const s3Key = String(body?.s3Key || '').trim()
  const expectedVersion = body?.expectedVersion == null ? null : Number(body.expectedVersion)
  if (!categoryId || !s3Key) return NextResponse.json({ success: false, message: 'Category and uploaded asset are required' }, { status: 400 })
  if (!s3Key.startsWith('public/ecosystem/banners/')) return NextResponse.json({ success: false, message: 'Invalid banner storage key' }, { status: 400 })
  try {
    const category = await (prisma as any).ecosystemCategory.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true, slug: true, title: true } })
    if (!category) return NextResponse.json({ success: false, message: 'Ecosystem category not found' }, { status: 404 })
    const verified = await verifyStoredBanner(s3Key, String(body?.contentType || ''), Number(body?.fileSizeBytes || 0))
    const current = await (prisma as any).ecosystemBanner.findFirst({ where: { categoryId, status: 'ACTIVE' }, orderBy: { version: 'desc' } })
    if (expectedVersion !== null && current && current.version !== expectedVersion) return NextResponse.json({ success: false, message: 'This banner changed in another admin session. Reload and try again.' }, { status: 409 })
    const version = Number(current?.version || 0) + 1
    const altText = String(body?.altText || `${category.title} ecosystem partner banner`).trim().slice(0, 300)
    const banner = await (prisma as any).$transaction(async (tx: any) => {
      await tx.ecosystemBanner.updateMany({ where: { categoryId, status: 'ACTIVE' }, data: { status: 'ARCHIVED' } })
      return tx.ecosystemBanner.create({ data: { categoryId, imageUrl: verified.imageUrl, storageKey: s3Key, altText, width: verified.width, height: verified.height, mimeType: verified.mimeType, fileSize: verified.fileSize, status: 'ACTIVE', version, createdBy: auth.userId, updatedBy: auth.userId } })
    })
    await writeAuditLog({ entityType: 'ECOSYSTEM_BANNER', entityId: banner.id, action: current ? 'ADMIN_ECOSYSTEM_BANNER_REPLACED' : 'ADMIN_ECOSYSTEM_BANNER_UPLOADED', performedByUserId: auth.userId, ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'), beforeState: current ? { storageKey: current.storageKey, version: current.version } : null, afterState: { storageKey: banner.storageKey, version: banner.version, status: banner.status }, meta: { categoryId, categorySlug: category.slug, originalName: safeOriginalName(body?.fileName) } })
    revalidateEcosystemBannerSurfaces(category.slug)
    return NextResponse.json({ success: true, data: banner })
  } catch (error) {
    console.error('Ecosystem banner finalize error:', error)
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Banner upload failed. Your existing banner has not been changed.' }, { status: 400 })
  }
}