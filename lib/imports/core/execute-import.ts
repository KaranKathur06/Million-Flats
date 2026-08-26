import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { acquireImportCommitLock, releaseImportCommitLock } from './commit-lock'
import { getImportRequestResult, saveImportRequestResult } from './idempotency-service'
import { getImportAdapterForEntity } from '@/lib/imports/registry'

export async function executeImport(input: { batchId: string; idempotencyKey: string }) {
  const existingRequest = await getImportRequestResult(input.batchId, input.idempotencyKey)
  if (existingRequest?.response) return { replayed: true, ...(existingRequest.response as object) }

  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')
  const entityType = batch.entityType || 'PROPERTY'
  const adapter = getImportAdapterForEntity(entityType)
  if (!adapter) throw new Error(`No import adapter is registered for ${entityType}.`)

  const locked = await acquireImportCommitLock(input.batchId)
  if (!locked) throw new Error('Import batch is not ready to commit or is already committing.')

  try {
    const records = await (prisma as any).importRecord.findMany({
    where: { batchId: input.batchId, status: { in: ['READY', 'WARNING', 'STAGED'] } },
    orderBy: { sourceRow: 'asc' },
    })
    if (batch.mode === 'STRICT' && records.some((record: any) => record.status === 'WARNING')) {
      throw new Error('Strict imports cannot commit unresolved warning records.')
    }
    const results: Array<{ recordId: string; entityId?: string; status: 'created' | 'updated' | 'skipped' | 'failed'; reason?: string }> = []
    const affectedPaths = new Set<string>()

    for (const record of records) {
      try {
        const payload = record.canonicalPayload as any
        if (!payload) throw new Error('Canonical payload is missing.')

        const committed = await (prisma as any).$transaction(async (tx: any) => {
          const created = await adapter.commit({ canonical: payload, operation: batch.operation, sourceRecordId: record.sourceRecordId, db: tx })
          await tx.importRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMMITTED',
              targetEntityType: entityType,
              targetEntityId: created.entityId,
              manualPropertyId: entityType === 'PROPERTY' ? created.entityId : null,
              commitAction: created.status,
            },
          })
          return created
        })
        if (committed.status === 'skipped') { results.push({ recordId: record.id, entityId: committed.entityId, status: 'skipped', reason: committed.reason }); continue }
        for (const path of committed.affectedPaths) {
          if (path) affectedPaths.add(path)
        }
        results.push({ recordId: record.id, entityId: committed.entityId, status: committed.status })
      } catch (error: any) {
        await (prisma as any).importRecord.update({
          where: { id: record.id },
          data: { status: 'ERROR' },
        })
        results.push({ recordId: record.id, status: 'failed', reason: error?.message || 'Commit failed' })
      }
    }

    const created = results.filter((result) => result.status === 'created').length
    const updated = results.filter((result) => result.status === 'updated').length
    const skipped = results.filter((result) => result.status === 'skipped').length
    const failed = results.filter((result) => result.status === 'failed').length
    const status = created === 0 && failed > 0 ? 'FAILED' : failed > 0 ? 'PARTIALLY_COMMITTED' : 'COMMITTED'
    await (prisma as any).importBatch.update({
      where: { id: input.batchId },
      data: { createdCount: created, updatedCount: updated, skippedCount: skipped, failedCount: failed },
    })
    await releaseImportCommitLock(input.batchId, status)
    for (const path of affectedPaths) {
      try {
        revalidatePath(path)
      } catch {
        // Cache refresh is best effort and must not change commit status.
      }
    }

    const response = { batchId: input.batchId, status, created, updated, skipped, failed, results }
    await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
    return { replayed: false, ...response }
  } catch (error) {
    await releaseImportCommitLock(input.batchId, 'FAILED')
    throw error
  }
}
