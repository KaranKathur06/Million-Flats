import { prisma } from '@/lib/prisma'

const cancellableStates = [
  'UPLOADED',
  'ANALYZING',
  'READY_FOR_REVIEW',
  'MAPPING_REVIEW',
  'NORMALIZING',
  'VALIDATING',
  'DUPLICATE_REVIEW',
  'READY_TO_COMMIT',
  'RETRYING',
]

export async function cancelImportBatch(input: { batchId: string; userId: string }) {
  const result = await (prisma as any).importBatch.updateMany({
    where: { id: input.batchId, status: { in: cancellableStates } },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledByUserId: input.userId,
      completedAt: new Date(),
    },
  })

  if (result.count !== 1) {
    const batch = await (prisma as any).importBatch.findUnique({
      where: { id: input.batchId },
      select: { id: true },
    })
    if (!batch) throw new Error('Import batch not found.')
    throw new Error('Import batch cannot be cancelled in its current state.')
  }

  return { batchId: input.batchId, status: 'CANCELLED' as const }
}
