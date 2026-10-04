import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  acquireImportCommitLock,
  ImportCommitOwnershipError,
  refreshImportCommitHeartbeat,
  releaseImportCommitLock,
} from './commit-lock'
import { getImportRequestResult, saveImportRequestResult } from './idempotency-service'
import { getImportAdapterForEntity } from '@/lib/imports/registry'

type CommitOutcomeRecord = { status: string; commitAction: string | null }

function countCommitOutcomes(records: CommitOutcomeRecord[]) {
  const created = records.filter((record) => record.status === 'COMMITTED' && record.commitAction === 'created').length
  const updated = records.filter((record) => record.status === 'COMMITTED' && record.commitAction === 'updated').length
  const skipped = records.filter((record) => record.status === 'COMMITTED' && record.commitAction === 'skipped').length
  const failed = records.filter((record) => record.status === 'ERROR' && record.commitAction === 'COMMIT_FAILED').length
  const committed = records.filter((record) => record.status === 'COMMITTED').length
  return { created, updated, skipped, failed, committed }
}

export async function executeImport(input: { batchId: string; idempotencyKey: string }) {
  const existingRequest = await getImportRequestResult(input.batchId, input.idempotencyKey)
  if (existingRequest?.response) return { replayed: true, ...(existingRequest.response as object) }

  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')
  const entityType = batch.entityType || 'PROPERTY'
  const adapter = getImportAdapterForEntity(entityType)
  if (!adapter) throw new Error(`No import adapter is registered for ${entityType}.`)
  if (batch.adapterVersion != null && adapter.adapterVersion !== batch.adapterVersion) {
    throw new Error(`Import adapter version mismatch for ${entityType}: batch ${batch.adapterVersion}, runtime ${adapter.adapterVersion}.`)
  }

  const attemptId = randomUUID()
  const locked = await acquireImportCommitLock(input.batchId, attemptId)
  if (!locked) {
    if (batch.status === 'COMMITTING') {
      throw new Error('Import batch is actively committing or has not been idle for 10 minutes.')
    }
    throw new Error('Import batch is not ready to commit or is already committing.')
  }

  let ownsLock = true
  try {
    const records = await (prisma as any).importRecord.findMany({
      where: { batchId: input.batchId, status: { in: ['READY', 'WARNING', 'STAGED', 'ERROR'] } },
      orderBy: { sourceRow: 'asc' },
    })
    const canRetryLegacyErrors =
      batch.errorCount === 0 &&
      ['PARTIALLY_COMMITTED', 'FAILED', 'COMMITTING'].includes(batch.status)
    const recordsToCommit = records.filter((record: any) =>
      ['READY', 'WARNING', 'STAGED'].includes(record.status) ||
      (record.status === 'ERROR' && (record.commitAction === 'COMMIT_FAILED' || canRetryLegacyErrors)),
    )

    if (batch.mode === 'STRICT' && recordsToCommit.some((record: any) => record.status === 'WARNING')) {
      throw new Error('Strict imports cannot commit unresolved warning records.')
    }
    if (recordsToCommit.length === 0) {
      const outcomeRecords = await (prisma as any).importRecord.findMany({
        where: { batchId: input.batchId },
        select: { status: true, commitAction: true },
      })
      const counts = countCommitOutcomes(outcomeRecords)
      if (outcomeRecords.length > 0 && counts.committed === outcomeRecords.length) {
        await (prisma as any).$transaction(async (tx: any) => {
          await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
          await tx.importBatch.update({
            where: { id: input.batchId },
            data: {
              createdCount: counts.created,
              updatedCount: counts.updated,
              skippedCount: counts.skipped,
              failedCount: counts.failed,
            },
          })
        })
        await releaseImportCommitLock(input.batchId, attemptId, 'COMMITTED')
        ownsLock = false
        const response = {
          batchId: input.batchId,
          status: 'COMMITTED',
          ...counts,
          attempted: 0,
          results: [],
          reconciled: true,
        }
        await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
        return { replayed: false, ...response }
      }
      const statusAfterNoWork = batch.status === 'COMMITTING'
        ? (counts.committed > 0 ? 'PARTIALLY_COMMITTED' : 'FAILED')
        : batch.status
      await releaseImportCommitLock(input.batchId, attemptId, statusAfterNoWork)
      ownsLock = false
      throw new Error('No eligible or failed records remain to commit.')
    }

    const results: Array<{ recordId: string; entityId?: string; status: 'created' | 'updated' | 'skipped' | 'failed'; reason?: string }> = []
    const affectedPaths = new Set<string>()

    for (const record of recordsToCommit) {
      try {
        const payload = record.canonicalPayload as any
        if (!payload) throw new Error('Canonical payload is missing.')

        const relations = await adapter.resolveRelations({ canonical: payload, raw: record.rawPayload, db: prisma })
        if (!relations.ready || relations.errors.length > 0) {
          throw new Error(relations.errors[0] || 'Required relationships could not be resolved.')
        }

        const committed = await (prisma as any).$transaction(async (tx: any) => {
          await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
          const created = await adapter.commit({ canonical: payload, operation: batch.operation, sourceRecordId: record.sourceRecordId, db: tx })
          await tx.importRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMMITTED',
              targetEntityType: entityType,
              targetEntityId: created.entityId,
              manualPropertyId: entityType === 'PROPERTY' ? created.entityId : null,
              commitAction: created.status,
              commitFailureReason: null,
            },
          })
          await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
          return created
        })
        if (committed.status === 'skipped') { results.push({ recordId: record.id, entityId: committed.entityId, status: 'skipped', reason: committed.reason }); continue }
        for (const path of committed.affectedPaths) {
          if (path) affectedPaths.add(path)
        }
        results.push({ recordId: record.id, entityId: committed.entityId, status: committed.status })
      } catch (error: any) {
        if (error instanceof ImportCommitOwnershipError) throw error
        const reason = error?.message || 'Commit failed'
        await (prisma as any).$transaction(async (tx: any) => {
          await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
          await tx.importRecord.update({
            where: { id: record.id },
            data: {
              status: 'ERROR',
              commitAction: 'COMMIT_FAILED',
              commitFailureReason: reason,
            },
          })
          await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
        })
        results.push({ recordId: record.id, status: 'failed', reason })
      }
    }

    const outcomeRecords = await (prisma as any).importRecord.findMany({
      where: { batchId: input.batchId },
      select: { status: true, commitAction: true },
    })
    const { created, updated, skipped, failed, committed } = countCommitOutcomes(outcomeRecords)
    const status = failed > 0 ? (committed > 0 ? 'PARTIALLY_COMMITTED' : 'FAILED') : 'COMMITTED'
    await (prisma as any).$transaction(async (tx: any) => {
      await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
      await tx.importBatch.update({
        where: { id: input.batchId },
        data: { createdCount: created, updatedCount: updated, skippedCount: skipped, failedCount: failed },
      })
    })
    await releaseImportCommitLock(input.batchId, attemptId, status)
    ownsLock = false
    for (const path of affectedPaths) {
      try {
        revalidatePath(path)
      } catch {
        // Cache refresh is best effort and must not change commit status.
      }
    }

    const response = { batchId: input.batchId, status, created, updated, skipped, failed, attempted: results.length, results }
    await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
    return { replayed: false, ...response }
  } catch (error) {
    if (ownsLock) await releaseImportCommitLock(input.batchId, attemptId, 'FAILED')
    throw error
  }
}
