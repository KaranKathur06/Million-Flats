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
import { summarizeCommitOutcomes } from './commit-outcomes'
import { withPrismaAcquisitionRetry } from './retry-pool-timeout'

export async function executeImport(input: { batchId: string; idempotencyKey: string }) {
  const existingRequest = await getImportRequestResult(input.batchId, input.idempotencyKey)
  if (existingRequest?.response) return { replayed: true, ...(existingRequest.response as object) }

  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')
  const entityType = batch.entityType || 'PROPERTY'
  const failureStage = batch.failureSummary && typeof batch.failureSummary === 'object'
    ? String((batch.failureSummary as any).stage || '')
    : ''
  if (failureStage === 'ANALYSIS') {
    throw new Error('Import analysis failed; retry analysis before attempting to commit.')
  }

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
    const existingOutcomes = summarizeCommitOutcomes(records, {
      allowLegacyErrors: canRetryLegacyErrors,
      failureStage,
    })
    if (existingOutcomes.inconsistent > 0) {
      throw new Error(`Import batch has ${existingOutcomes.inconsistent} record(s) with inconsistent commit outcomes.`)
    }
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
      const counts = summarizeCommitOutcomes(outcomeRecords, {
        allowLegacyErrors: canRetryLegacyErrors,
        failureStage,
      })
      if (counts.recordCount > 0 && counts.committed === counts.recordCount && counts.inconsistent === 0) {
        await withPrismaAcquisitionRetry(
          () => (prisma as any).$transaction(async (tx: any) => {
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
          }),
          { batchId: input.batchId, recordId: 'batch', operation: 'commit finalization' },
        )
        await releaseImportCommitLock(input.batchId, attemptId, 'COMMITTED')
        ownsLock = false
        const response = {
          batchId: input.batchId,
          status: 'COMMITTED',
          created: counts.created,
          updated: counts.updated,
          skipped: counts.skipped,
          failed: counts.failed,
          committed: counts.committed,
          attempted: 0,
          results: [],
          reconciled: true,
        }
        await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
        return { replayed: false, ...response }
      }
      const noWorkFailure = counts.inconsistent > 0
        ? `Import batch has ${counts.inconsistent} record(s) with inconsistent commit outcomes.`
        : 'No eligible or failed records remain to commit.'
      const statusAfterNoWork = counts.inconsistent > 0
        ? (counts.committed > 0 ? 'PARTIALLY_COMMITTED' : 'FAILED')
        : ['READY_FOR_REVIEW', 'READY_TO_COMMIT', 'PARTIALLY_COMMITTED', 'FAILED'].includes(batch.status)
          ? batch.status
          : counts.committed > 0
            ? 'PARTIALLY_COMMITTED'
            : 'FAILED'
      await releaseImportCommitLock(
        input.batchId,
        attemptId,
        statusAfterNoWork,
        counts.inconsistent > 0
          ? { failureSummary: { stage: 'COMMIT', message: noWorkFailure } }
          : {},
      )
      ownsLock = false
      throw new Error(noWorkFailure)
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

        const committed = await withPrismaAcquisitionRetry(
          () => (prisma as any).$transaction(async (tx: any) => {
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
          }),
          { batchId: input.batchId, recordId: record.id, operation: 'record commit' },
        )
        if (committed.status === 'skipped') { results.push({ recordId: record.id, entityId: committed.entityId, status: 'skipped', reason: committed.reason }); continue }
        for (const path of committed.affectedPaths) {
          if (path) affectedPaths.add(path)
        }
        results.push({ recordId: record.id, entityId: committed.entityId, status: committed.status })
      } catch (error: any) {
        if (error instanceof ImportCommitOwnershipError) throw error
        const reason = error?.message || 'Commit failed'
        await withPrismaAcquisitionRetry(
          () => (prisma as any).$transaction(async (tx: any) => {
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
          }),
          { batchId: input.batchId, recordId: record.id, operation: 'record failure checkpoint' },
        )
        results.push({ recordId: record.id, status: 'failed', reason })
      }
    }

    const outcomeRecords = await (prisma as any).importRecord.findMany({
      where: { batchId: input.batchId },
      select: { status: true, commitAction: true },
    })
    const outcomes = summarizeCommitOutcomes(outcomeRecords, {
      allowLegacyErrors: canRetryLegacyErrors,
      failureStage: 'COMMIT',
    })
    const allCommitted = outcomes.recordCount > 0 &&
      outcomes.committed === outcomes.recordCount &&
      outcomes.inconsistent === 0
    const status = allCommitted
      ? 'COMMITTED'
      : outcomes.inconsistent > 0
        ? 'FAILED'
        : outcomes.committed > 0
          ? 'PARTIALLY_COMMITTED'
          : 'FAILED'
    const failureSummary = outcomes.failed > 0 || outcomes.inconsistent > 0
      ? {
          stage: 'COMMIT',
          message: outcomes.inconsistent > 0
            ? `Import commit found ${outcomes.inconsistent} record(s) with inconsistent outcomes.`
            : `${outcomes.failed} record(s) failed during commit.`,
        }
      : undefined
    await withPrismaAcquisitionRetry(
      () => (prisma as any).$transaction(async (tx: any) => {
        await refreshImportCommitHeartbeat(tx, input.batchId, attemptId)
        await tx.importBatch.update({
          where: { id: input.batchId },
          data: {
            createdCount: outcomes.created,
            updatedCount: outcomes.updated,
            skippedCount: outcomes.skipped,
            failedCount: outcomes.failed,
          },
        })
      }),
      { batchId: input.batchId, recordId: 'batch', operation: 'commit outcome reconciliation' },
    )
    await releaseImportCommitLock(input.batchId, attemptId, status, { failureSummary })
    ownsLock = false
    for (const path of affectedPaths) {
      try {
        revalidatePath(path)
      } catch {
        // Cache refresh is best effort and must not change commit status.
      }
    }

    if (outcomes.inconsistent > 0) {
      throw new Error(failureSummary?.message || 'Import commit found inconsistent record outcomes.')
    }

    const response = {
      batchId: input.batchId,
      status,
      created: outcomes.created,
      updated: outcomes.updated,
      skipped: outcomes.skipped,
      failed: outcomes.failed,
      attempted: results.length,
      results,
    }
    await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
    return { replayed: false, ...response }
  } catch (error) {
    if (ownsLock) {
      const failureSummary = {
        stage: 'COMMIT',
        message: error instanceof Error ? error.message : 'Import commit failed.',
      }
      let counts: ReturnType<typeof summarizeCommitOutcomes> | undefined
      try {
        const records = await (prisma as any).importRecord.findMany({
          where: { batchId: input.batchId },
          select: { status: true, commitAction: true },
        })
        counts = summarizeCommitOutcomes(records, {
          allowLegacyErrors: canRetryLegacyErrorsForBatch(batch),
          failureStage: 'COMMIT',
        })
      } catch (reconciliationError) {
        console.error(`[Import Commit] Could not reconcile persisted outcomes for batch ${input.batchId}:`, reconciliationError)
      }

      try {
        await releaseImportCommitLock(input.batchId, attemptId, 'FAILED', {
          failureSummary: {
            ...failureSummary,
            ...(counts ? { inconsistentCount: counts.inconsistent } : {}),
          },
          ...(counts ? {
            counts: {
              createdCount: counts.created,
              updatedCount: counts.updated,
              skippedCount: counts.skipped,
              failedCount: counts.failed,
            },
          } : {}),
        })
      } catch (releaseError) {
        console.error(`[Import Commit] Could not release failed commit attempt for batch ${input.batchId}; stale recovery remains available:`, releaseError)
      }
    }
    throw error
  }
}

function canRetryLegacyErrorsForBatch(batch: any) {
  return batch.errorCount === 0 &&
    ['PARTIALLY_COMMITTED', 'FAILED', 'COMMITTING'].includes(batch.status)
}
