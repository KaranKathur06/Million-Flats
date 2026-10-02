import { prisma } from '@/lib/prisma'
import { revalidateManualPropertyPaths } from '@/lib/manualPropertyAdminLifecycle'

type DeleteDraftInput = {
  propertyId: string
  actorUserId: string
  ipAddress?: string | null
}

export async function deleteManualPropertyDraft(input: DeleteDraftInput) {
  const propertyId = String(input.propertyId || '').trim()
  if (!propertyId) return { ok: false as const, status: 404, message: 'Draft not found' }

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const existing = await tx.manualProperty.findFirst({
      where: { id: propertyId, sourceType: 'MANUAL' },
      select: {
        id: true,
        title: true,
        intent: true,
        status: true,
        media: { select: { s3Key: true } },
      },
    })

    if (!existing) return { ok: false as const, status: 404, message: 'Draft not found' }
    if (String(existing.status) !== 'DRAFT') {
      return { ok: false as const, status: 409, message: 'Only drafts can be permanently deleted.' }
    }

    const storageKeys = Array.from(new Set(
      (existing.media || [])
        .map((media: any) => String(media?.s3Key || '').trim())
        .filter(Boolean),
    ))
    const cleanupJob = storageKeys.length
      ? await tx.storageCleanupJob.create({ data: { storageItems: storageKeys } })
      : null

    await tx.auditLog.create({
      data: {
        entityType: 'MANUAL_PROPERTY',
        entityId: propertyId,
        action: 'DRAFT_DELETED',
        performedByUserId: input.actorUserId,
        ipAddress: input.ipAddress || null,
        beforeState: { status: 'DRAFT', mediaCount: existing.media.length },
        afterState: { deleted: true },
        meta: {
          actor: 'admin',
          deletedMediaCount: storageKeys.length,
          cleanupJobId: cleanupJob?.id || null,
        },
      },
    })

    await tx.manualPropertyModerationLog.deleteMany({ where: { propertyId } })
    await tx.manualDuplicateOverrideLog.deleteMany({ where: { propertyId } })
    await tx.inquiry.deleteMany({ where: { propertyId } })
    await tx.manualProperty.delete({ where: { id: propertyId } })

    return {
      ok: true as const,
      property: { id: existing.id, title: existing.title, intent: existing.intent },
      cleanupJobId: cleanupJob?.id || null,
    }
  })

  if (result.ok) revalidateManualPropertyPaths(result.property)
  return result
}