import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { revalidateEcosystemBannerSurfaces } from '@/lib/ecosystem/banner'

export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  const altText = String(body?.altText || '').trim().slice(0, 300)
  if (!altText) return NextResponse.json({ success: false, message: 'Alt text is required' }, { status: 400 })
  try {
    const current = await (prisma as any).ecosystemBanner.findUnique({ where: { id: params.id }, include: { category: { select: { slug: true, title: true } } } })
    if (!current || current.status !== 'ACTIVE') return NextResponse.json({ success: false, message: 'Active banner not found' }, { status: 404 })
    if (body?.version != null && Number(body.version) !== current.version) return NextResponse.json({ success: false, message: 'This banner changed in another admin session. Reload and try again.' }, { status: 409 })
    const updated = await (prisma as any).ecosystemBanner.update({ where: { id: current.id }, data: { altText, version: { increment: 1 }, updatedBy: auth.userId } })
    await writeAuditLog({ entityType: 'ECOSYSTEM_BANNER', entityId: updated.id, action: 'ADMIN_ECOSYSTEM_BANNER_REPLACED', performedByUserId: auth.userId, beforeState: { altText: current.altText }, afterState: { altText: updated.altText, version: updated.version }, meta: { categoryId: current.categoryId, metadataOnly: true } })
    revalidateEcosystemBannerSurfaces(current.category.slug)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Ecosystem banner update error:', error)
    return NextResponse.json({ success: false, message: 'Failed to update banner metadata' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = await req.json().catch(() => null)
  try {
    const current = await (prisma as any).ecosystemBanner.findUnique({ where: { id: params.id }, include: { category: { select: { slug: true, title: true } } } })
    if (!current || current.status !== 'ACTIVE') return NextResponse.json({ success: false, message: 'Active banner not found' }, { status: 404 })
    if (body?.version != null && Number(body.version) !== current.version) return NextResponse.json({ success: false, message: 'This banner changed in another admin session. Reload and try again.' }, { status: 409 })
    const updated = await (prisma as any).$transaction(async (tx: any) => {
      const archived = await tx.ecosystemBanner.update({ where: { id: current.id }, data: { status: 'ARCHIVED', version: { increment: 1 }, updatedBy: auth.userId } })
      await tx.ecosystemCategory.update({ where: { id: current.categoryId }, data: { heroImage: '' } })
      return archived
    })
    await writeAuditLog({ entityType: 'ECOSYSTEM_BANNER', entityId: updated.id, action: 'ADMIN_ECOSYSTEM_BANNER_REMOVED', performedByUserId: auth.userId, ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip'), beforeState: { storageKey: current.storageKey, status: current.status, version: current.version }, afterState: { storageKey: updated.storageKey, status: updated.status, version: updated.version }, meta: { categoryId: current.categoryId, categorySlug: current.category.slug, fallback: 'legacy-or-built-in' } })
    revalidateEcosystemBannerSurfaces(current.category.slug)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Ecosystem banner removal error:', error)
    return NextResponse.json({ success: false, message: 'Failed to remove banner' }, { status: 500 })
  }
}