import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { applyApprovalDefaults } from '@/lib/ecosystem/partnerVisibility'
import { checkProjectPublishReadiness } from '@/lib/publicationReadiness'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const bodySchema = z.object({
  entity: z.enum(['developers', 'agencies', 'ecosystem-partners', 'projects', 'properties']),
  ids: z.array(z.string().trim().min(1)).min(1).max(100),
  action: z.enum(['approve', 'publish', 'unpublish', 'archive', 'reject', 'restore', 'suspend', 'sold', 'delete', 'permanent_delete']).optional(),
  reason: z.string().max(1000).optional(),
})

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid bulk approval request' }, { status: 400 })
  }

  const { entity, reason } = parsed.data
  const action = parsed.data.action || 'approve'
  const ids = uniqueIds(parsed.data.ids)
  if (!ids.length) {
    return NextResponse.json({ success: false, message: 'No records selected' }, { status: 400 })
  }

  try {
    const success: string[] = []
    const failures: Array<{ id: string; message: string }> = []

    if (entity === 'developers') {
      if (action === 'delete' || action === 'permanent_delete') {
        const result = action === 'permanent_delete'
          ? await (prisma as any).developer.deleteMany({ where: { id: { in: ids } } })
          : await (prisma as any).developer.updateMany({ where: { id: { in: ids } }, data: { status: 'INACTIVE', isFeatured: false, isDeleted: true, deletedAt: new Date() } })
        success.push(...ids.slice(0, result.count))
      } else if (action === 'restore') {
        const result = await (prisma as any).developer.updateMany({ where: { id: { in: ids } }, data: { status: 'ACTIVE', isDeleted: false, deletedAt: null } })
        success.push(...ids.slice(0, result.count))
      } else {
      const rows = await (prisma as any).developer.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, isDeleted: true },
      })
      const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]))
      for (const id of ids) {
        const row = byId.get(id)
        if (!row) failures.push({ id, message: 'Developer not found' })
        else if (row.isDeleted) failures.push({ id, message: 'Deleted developer cannot be published' })
        else if (!String(row.name || '').trim() || !String(row.slug || '').trim()) failures.push({ id, message: 'Developer name and slug are required' })
        else {
          await (prisma as any).developer.update({ where: { id }, data: { status: action === 'unpublish' ? 'INACTIVE' : 'ACTIVE' } })
          success.push(id)
        }
      }
      }
    }

    if (entity === 'agencies') {
      const existing = await (prisma as any).agencyProfile.findMany({ where: { id: { in: ids } }, select: { id: true } })
      const existingIds = new Set(existing.map((row: any) => row.id))
      const agencyData: Record<string, unknown> = action === 'approve'
        ? { onboardingStatus: 'APPROVED', verificationStatus: 'VERIFIED', isVerified: true, verifiedAt: new Date(), approvedBy: auth.userId, approvedAt: new Date() }
        : action === 'unpublish'
          ? { onboardingStatus: 'PROFILE_COMPLETED', isVerified: false }
          : action === 'reject'
            ? { onboardingStatus: 'REJECTED', verificationStatus: 'REJECTED' }
            : action === 'delete'
              ? { onboardingStatus: 'REJECTED', verificationStatus: 'REJECTED', isVerified: false }
            : action === 'suspend'
              ? { onboardingStatus: 'SUSPENDED', suspendedAt: new Date(), suspendedBy: auth.userId }
              : action === 'restore'
                ? { onboardingStatus: 'PROFILE_COMPLETED', suspendedAt: null, suspendedBy: null }
                : {}
      const result = action === 'permanent_delete'
        ? await (prisma as any).agencyProfile.deleteMany({ where: { id: { in: ids } } })
        : await (prisma as any).agencyProfile.updateMany({
        where: { id: { in: Array.from(existingIds) } },
        data: agencyData,
      })
      success.push(...(Array.from(existingIds) as string[]).slice(0, result.count))
      for (const id of ids) if (!existingIds.has(id)) failures.push({ id, message: 'Agency not found' })
    }

    if (entity === 'ecosystem-partners') {
      const rows = await (prisma as any).ecosystemPartner.findMany({ where: { id: { in: ids } }, select: { id: true } })
      const existingIds = new Set(rows.map((row: any) => row.id))
      for (const id of ids) {
        if (!existingIds.has(id)) {
          failures.push({ id, message: 'Ecosystem partner not found' })
          continue
        }
        if (action === 'permanent_delete') {
          await (prisma as any).ecosystemPartner.delete({ where: { id } })
        } else {
        await (prisma as any).ecosystemPartner.update({
          where: { id },
          data: applyApprovalDefaults({
            status: action === 'approve' ? 'APPROVED' : action === 'unpublish' ? 'PENDING' : 'REJECTED',
          }),
        })
        }
        success.push(id)
      }
    }

    if (entity === 'projects') {
      if (action === 'delete' || action === 'permanent_delete') {
        const result = action === 'permanent_delete'
          ? await (prisma as any).project.deleteMany({ where: { id: { in: ids } } })
          : await (prisma as any).project.updateMany({ where: { id: { in: ids, isDeleted: false } }, data: { isDeleted: true, deletedAt: new Date(), deletedBy: auth.userId, isFeatured: false, featuredOrder: null } })
        success.push(...ids.slice(0, result.count))
      } else {
      const rows = await (prisma as any).project.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, developerId: true, isDeleted: true, status: true },
      })
      const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]))
      for (const id of ids) {
        const row = byId.get(id)
        if (!row) failures.push({ id, message: 'Project not found' })
        else if (action === 'archive') {
          await (prisma as any).project.update({ where: { id }, data: { status: 'ARCHIVED', archivedAt: new Date(), isFeatured: false, featuredOrder: null } })
          success.push(id)
        } else if (action === 'restore') {
          await (prisma as any).project.update({ where: { id }, data: { status: 'DRAFT', archivedAt: null } })
          success.push(id)
        } else if (action === 'unpublish') {
          await (prisma as any).project.update({ where: { id }, data: { status: 'DRAFT' } })
          success.push(id)
        } else if (row.status === 'ARCHIVED') failures.push({ id, message: 'Archived project cannot be published' })
        else {
          const readiness = checkProjectPublishReadiness(row)
          if (!readiness.ok) failures.push({ id, message: readiness.message })
          else {
            await (prisma as any).project.update({ where: { id }, data: { status: 'PUBLISHED', archivedAt: null } })
            success.push(id)
          }
        }
      }
      }
    }

    if (entity === 'properties') {
      if (action === 'permanent_delete') {
        const result = await (prisma as any).manualProperty.deleteMany({ where: { id: { in: ids }, sourceType: 'MANUAL' } })
        success.push(...ids.slice(0, result.count))
      } else for (const id of ids) {
        const result = await applyManualPropertyAdminAction({
          propertyId: id,
          action: action === 'approve' || action === 'publish' ? 'publish' : action === 'sold' ? 'mark_sold' : action === 'delete' ? 'archive' : action as any,
          actorUserId: auth.userId,
          ipAddress: getIp(req),
          reason,
        })
        if (result.ok) success.push(id)
        else failures.push({ id, message: result.message })
      }
    }

    revalidatePath('/developers')
    revalidatePath('/agencies')
    revalidatePath('/projects')
    revalidatePath('/buy')
    revalidatePath('/rent')
    revalidatePath('/properties')
    revalidatePath('/ecosystem-partners/[slug]', 'page')

    return NextResponse.json({
      success: true,
      entity,
      requested: ids.length,
      approved: success,
      updated: success.length,
      failures,
    })
  } catch (error) {
    console.error('[POST /api/admin/bulk-approve]', error)
    return NextResponse.json({ success: false, message: 'Bulk approval failed' }, { status: 500 })
  }
}