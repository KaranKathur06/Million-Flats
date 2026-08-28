import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

const ROLLBACK_ENTITY_MODELS: Record<string, string> = {
  PROPERTY: 'manualProperty',
  DEVELOPER: 'developer',
  PROJECT: 'project',
  ECOSYSTEM_PARTNER: 'ecosystemPartner',
  AGENCY: 'agency',
  AGENT: 'agent',
  LEAD: 'lead',
}

const ROLLBACK_PATHS: Record<string, string[]> = {
  PROPERTY: ['/buy', '/rent', '/properties', '/agents'],
  DEVELOPER: ['/developers'],
  PROJECT: ['/projects'],
  ECOSYSTEM_PARTNER: ['/ecosystem-partners'],
  AGENCY: ['/agencies'],
  AGENT: ['/agents'],
  LEAD: ['/admin/leads'],
}

function auditEntityType(entityType: string): 'MANUAL_PROPERTY' | 'AGENT' | 'ECOSYSTEM_PARTNER' | 'PROJECT' {
  if (entityType === 'PROPERTY') return 'MANUAL_PROPERTY'
  if (entityType === 'AGENT') return 'AGENT'
  if (entityType === 'ECOSYSTEM_PARTNER') return 'ECOSYSTEM_PARTNER'
  return 'PROJECT'
}

export async function rollbackImportBatch(input: { batchId: string; userId: string }) {
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId }, include: { records: true } })
  if (!batch) throw new Error('Import batch not found.')
  if (!['COMMITTED', 'PARTIALLY_COMMITTED'].includes(String(batch.status))) throw new Error('Only committed import batches can be rolled back.')

  const entityType = String(batch.entityType || '').toUpperCase()
  const modelName = ROLLBACK_ENTITY_MODELS[entityType]
  if (!modelName) throw new Error(`Rollback is not supported for ${entityType || 'this entity'}.`)

  const createdRecords = batch.records.filter((record: any) => record.commitAction === 'created' && record.targetEntityId)
  const createdIds = createdRecords.map((record: any) => String(record.targetEntityId))
  if (!createdIds.length) throw new Error('This batch has no newly created records eligible for rollback.')

  const model = (prisma as any)[modelName]
  if (!model) throw new Error(`Rollback is not supported for ${entityType}.`)

  const targets = await model.findMany({
    where: { id: { in: createdIds } },
    select: { id: true, createdAt: true, updatedAt: true },
  })
  const batchStartedAt = batch.startedAt ? new Date(batch.startedAt).getTime() : 0
  const batchCompletedAt = batch.completedAt ? new Date(batch.completedAt).getTime() : Date.now()
  const targetById = new Map(targets.map((target: any) => [String(target.id), target]))
  const missing = createdIds.some((id: string) => !targetById.has(id))
  const modified = targets.some((target: any) => {
    const createdAt = new Date(target.createdAt).getTime()
    const updatedAt = new Date(target.updatedAt).getTime()
    return (batchStartedAt > 0 && createdAt < batchStartedAt) || updatedAt > batchCompletedAt
  })
  if (missing || modified) {
    throw new Error('Rollback blocked: one or more imported records were modified or removed after commit.')
  }

  await (prisma as any).$transaction(async (tx: any) => {
    await tx[modelName].deleteMany({ where: { id: { in: createdIds } } })
    await tx.importRecord.updateMany({ where: { batchId: input.batchId, targetEntityId: { in: createdIds }, commitAction: 'created' }, data: { commitAction: 'rolled_back', targetEntityId: null, manualPropertyId: null, status: 'SKIPPED' } })
    await tx.importBatch.update({ where: { id: input.batchId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: input.userId } })
  })

  for (const path of ROLLBACK_PATHS[entityType] || []) {
    try { revalidatePath(path) } catch { /* cache refresh is best effort */ }
  }
  await writeAuditLog({ entityType: auditEntityType(entityType), entityId: input.batchId, action: 'ADMIN_ARCHIVED', performedByUserId: input.userId, meta: { actor: 'universal-import', action: 'ROLLBACK', batchId: input.batchId, importEntityType: entityType, rolledBackCount: createdIds.length } })
  return { batchId: input.batchId, status: 'CANCELLED', rolledBack: createdIds.length }
}