import { prisma } from '@/lib/prisma'
import { invalidateAfterMappingChange, invalidateAfterOwnershipChange } from './state-machine'

export async function invalidateImportBatch(input: { batchId: string; change: 'mapping' | 'ownership' }) {
  const nextStatus = input.change === 'mapping'
    ? invalidateAfterMappingChange()
    : invalidateAfterOwnershipChange()

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const batch = await tx.importBatch.findUnique({
      where: { id: input.batchId },
      select: { id: true, status: true, mappingVersion: true },
    })
    if (!batch) throw new Error('Import batch not found.')

    const records = await tx.importRecord.updateMany({
      where: { batchId: input.batchId, status: { not: 'COMMITTED' } },
      data: {
        status: 'DISCOVERED',
        normalizedPayload: null,
        canonicalPayload: null,
        overallConfidence: null,
      },
    })
    const updatedBatch = await tx.importBatch.update({
      where: { id: input.batchId },
      data: {
        status: nextStatus,
        mappingVersion: input.change === 'mapping' ? batch.mappingVersion + 1 : batch.mappingVersion,
      },
    })
    return { batch: updatedBatch, resetRecords: records.count }
  })

  return {
    batchId: result.batch.id,
    status: nextStatus,
    resetRecords: result.resetRecords,
  }
}
