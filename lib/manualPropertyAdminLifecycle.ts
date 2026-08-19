import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { writeAuditLog, type AuditAction } from '@/lib/audit'
import {
  MANUAL_PROPERTY_PUBLIC_STATUS,
  statusForManualPropertyAction,
  type ManualPropertyLifecycleAction,
} from '@/lib/manualPropertyLifecycle'
import { buildManualPropertyPath } from '@/lib/manualPropertyRoutes'
import { checkManualPropertyPublishReadiness } from '@/lib/publicationReadiness'

function actionToAuditAction(action: ManualPropertyLifecycleAction): AuditAction {
  switch (action) {
    case 'publish':
      return 'ADMIN_APPROVED'
    case 'unpublish':
      return 'PUBLISHED_CLONED_TO_DRAFT'
    case 'archive':
      return 'ADMIN_ARCHIVED'
    case 'restore':
    case 'restore_published':
      return 'ADMIN_RESTORED'
    case 'reject':
      return 'ADMIN_REJECTED'
    case 'draft':
      return 'PUBLISHED_CLONED_TO_DRAFT'
    case 'mark_sold':
      return 'ADMIN_ARCHIVED'
  }
}

export function revalidateManualPropertyPaths(property: any) {
  try {
    revalidatePath('/buy')
    revalidatePath('/rent')
    revalidatePath('/properties')
    revalidatePath('/admin/properties')
    revalidatePath('/agents')
    if (property?.id) revalidatePath(`/properties/${property.id}`)
    const path = buildManualPropertyPath({ id: property?.id, title: property?.title, intent: property?.intent })
    if (path) revalidatePath(path)
  } catch {
    // Revalidation is a cache hint; mutations should not fail if it is unavailable.
  }
}

export async function applyManualPropertyAdminAction(input: {
  propertyId: string
  action: ManualPropertyLifecycleAction
  actorUserId: string
  ipAddress?: string | null
  reason?: string | null
}) {
  const propertyId = String(input.propertyId || '').trim()
  if (!propertyId) return { ok: false as const, status: 404, message: 'Property not found' }

  const existing = await (prisma as any).manualProperty.findFirst({
    where: { id: propertyId, sourceType: 'MANUAL' },
    select: {
      id: true,
      title: true,
      intent: true,
      status: true,
      archivedAt: true,
      archivedBy: true,
      rejectionReason: true,
      countryIso2: true,
      city: true,
    },
  })

  if (!existing) return { ok: false as const, status: 404, message: 'Property not found' }

  if (input.action === 'publish' || input.action === 'restore_published') {
    const readiness = checkManualPropertyPublishReadiness(existing)
    if (!readiness.ok) return { ok: false as const, status: 422, message: readiness.message }
  }

  let nextStatus: string
  try {
    nextStatus = statusForManualPropertyAction(input.action, String(existing.status || 'DRAFT'))
  } catch (err: any) {
    return { ok: false as const, status: 409, message: err?.message || 'Invalid lifecycle transition' }
  }

  const data: any = { status: nextStatus }
  if (nextStatus === MANUAL_PROPERTY_PUBLIC_STATUS) {
    data.submittedAt = new Date()
    data.archivedAt = null
    data.archivedBy = null
    data.rejectionReason = null
  }
  if (nextStatus === 'DRAFT') {
    data.archivedAt = null
    data.archivedBy = null
  }
  if (nextStatus === 'ARCHIVED') {
    data.archivedAt = new Date()
    data.archivedBy = input.actorUserId
  }
  if (nextStatus === 'REJECTED') {
    data.rejectionReason = String(input.reason || '').trim() || null
  }

  const beforeState = {
    status: String(existing.status || ''),
    archivedAt: existing.archivedAt,
    archivedBy: existing.archivedBy,
    rejectionReason: existing.rejectionReason,
  }

  const updated = await (prisma as any).manualProperty.update({
    where: { id: propertyId },
    data,
    select: {
      id: true,
      title: true,
      intent: true,
      status: true,
      archivedAt: true,
      archivedBy: true,
      rejectionReason: true,
    },
  })

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: propertyId,
    action: actionToAuditAction(input.action),
    performedByUserId: input.actorUserId,
    ipAddress: input.ipAddress || null,
    beforeState,
    afterState: {
      status: String(updated.status || ''),
      archivedAt: updated.archivedAt,
      archivedBy: updated.archivedBy,
      rejectionReason: updated.rejectionReason,
    },
    meta: { actor: 'admin', lifecycleAction: input.action },
  })

  if (input.action === 'publish' || input.action === 'reject') {
    await (prisma as any).manualPropertyModerationLog.create({
      data: {
        propertyId,
        adminId: input.actorUserId,
        action: input.action === 'publish' ? 'APPROVE' : 'REJECT',
        reason: input.reason || null,
      },
    }).catch(() => null)
  }

  revalidateManualPropertyPaths(updated)
  return { ok: true as const, property: updated }
}
