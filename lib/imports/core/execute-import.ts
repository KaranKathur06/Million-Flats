import { prisma } from '@/lib/prisma'
import { createManualProperty, type ManualPropertyCreateInput } from '@/lib/manualPropertyService'
import { revalidatePath } from 'next/cache'
import { acquireImportCommitLock, releaseImportCommitLock } from './commit-lock'
import { getImportRequestResult, saveImportRequestResult } from './idempotency-service'

export async function executeImport(input: { batchId: string; idempotencyKey: string }) {
  const existingRequest = await getImportRequestResult(input.batchId, input.idempotencyKey)
  if (existingRequest?.response) return { replayed: true, ...(existingRequest.response as object) }

  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')

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
    const results: Array<{ recordId: string; propertyId?: string; status: 'created' | 'skipped' | 'failed'; reason?: string }> = []
    const affectedPaths = new Set<string>()

    for (const record of records) {
      try {
        const payload = record.canonicalPayload as ManualPropertyCreateInput | null
        if (!payload) throw new Error('Canonical payload is missing.')

        const committed = await (prisma as any).$transaction(async (tx: any) => {
          const duplicateFilters = [
            payload.sourceProvider && payload.sourceListingId
              ? { sourceProvider: payload.sourceProvider, sourceListingId: payload.sourceListingId }
              : null,
            payload.sourceUrl ? { sourceUrl: payload.sourceUrl } : null,
          ].filter(Boolean)
          if (duplicateFilters.length > 0 && tx.manualProperty?.findFirst) {
            const existing = await tx.manualProperty.findFirst({
              where: { OR: duplicateFilters },
              select: { id: true },
            })
            if (existing) {
              await tx.importRecord.update({
                where: { id: record.id },
                data: {
                  status: 'SKIPPED',
                  targetEntityType: 'PROPERTY',
                  targetEntityId: existing.id,
                  manualPropertyId: existing.id,
                },
              })
              return { skipped: true, property: existing, affectedPaths: [] }
            }
          }

          const created = await createManualProperty(payload, { db: tx })
          await tx.importRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMMITTED',
              targetEntityType: 'PROPERTY',
              targetEntityId: created.property.id,
              manualPropertyId: created.property.id,
            },
          })
          return created
        })
        if (committed.skipped) {
          results.push({ recordId: record.id, propertyId: committed.property.id, status: 'skipped' })
          continue
        }
        for (const path of committed.affectedPaths) {
          if (path) affectedPaths.add(path)
        }
        results.push({ recordId: record.id, propertyId: committed.property.id, status: 'created' })
      } catch (error: any) {
        await (prisma as any).importRecord.update({
          where: { id: record.id },
          data: { status: 'ERROR' },
        })
        results.push({ recordId: record.id, status: 'failed', reason: error?.message || 'Commit failed' })
      }
    }

    const created = results.filter((result) => result.status === 'created').length
    const skipped = results.filter((result) => result.status === 'skipped').length
    const failed = results.filter((result) => result.status === 'failed').length
    const status = created === 0 && failed > 0 ? 'FAILED' : failed > 0 ? 'PARTIALLY_COMMITTED' : 'COMMITTED'
    await (prisma as any).importBatch.update({
      where: { id: input.batchId },
      data: { createdCount: created, skippedCount: skipped, failedCount: failed },
    })
    await releaseImportCommitLock(input.batchId, status)
    for (const path of affectedPaths) {
      try {
        revalidatePath(path)
      } catch {
        // Cache refresh is best effort and must not change commit status.
      }
    }

    const response = { batchId: input.batchId, status, created, skipped, failed, results }
    await saveImportRequestResult(input.batchId, input.idempotencyKey, response)
    return { replayed: false, ...response }
  } catch (error) {
    await releaseImportCommitLock(input.batchId, 'FAILED')
    throw error
  }
}
