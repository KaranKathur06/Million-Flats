import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

export async function rollbackImportBatch(input: { batchId: string; userId: string }) {
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId }, include: { records: true } })
  if (!batch) throw new Error('Import batch not found.')
  if (batch.entityType !== 'PROPERTY') throw new Error('Rollback is currently limited to imported draft properties.')
  if (!['COMMITTED', 'PARTIALLY_COMMITTED'].includes(String(batch.status))) throw new Error('Only committed import batches can be rolled back.')

  const createdIds = batch.records.filter((record: any) => record.commitAction === 'created' && record.manualPropertyId).map((record: any) => record.manualPropertyId)
  if (!createdIds.length) throw new Error('This batch has no newly created draft properties eligible for rollback.')

  const properties = await (prisma as any).manualProperty.findMany({ where: { id: { in: createdIds } }, select: { id: true, title: true, status: true, sourceType: true } })
  if (properties.length !== createdIds.length || properties.some((property: any) => property.sourceType !== 'MANUAL' || property.status !== 'DRAFT')) {
    throw new Error('Rollback blocked: one or more imported properties were modified, published, or removed from the draft state.')
  }

  await (prisma as any).$transaction(async (tx: any) => {
    await tx.manualProperty.deleteMany({ where: { id: { in: createdIds }, sourceType: 'MANUAL', status: 'DRAFT' } })
    await tx.importRecord.updateMany({ where: { batchId: input.batchId, manualPropertyId: { in: createdIds } }, data: { commitAction: 'rolled_back', targetEntityId: null, manualPropertyId: null, status: 'SKIPPED' } })
    await tx.importBatch.update({ where: { id: input.batchId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: input.userId } })
  })

  await writeAuditLog({ entityType: 'MANUAL_PROPERTY', entityId: input.batchId, action: 'ADMIN_ARCHIVED', performedByUserId: input.userId, meta: { actor: 'universal-import', action: 'ROLLBACK', batchId: input.batchId, rolledBackCount: createdIds.length } })
  return { batchId: input.batchId, status: 'CANCELLED', rolledBack: createdIds.length }
}