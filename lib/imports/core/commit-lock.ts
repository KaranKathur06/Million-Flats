import { prisma } from '@/lib/prisma'

export async function acquireImportCommitLock(batchId: string) {
  const result = await (prisma as any).importBatch.updateMany({
    where: { id: batchId, status: 'READY_TO_COMMIT' },
    data: { status: 'COMMITTING', startedAt: new Date() },
  })
  return result.count === 1
}

export async function releaseImportCommitLock(batchId: string, status: 'COMMITTED' | 'PARTIALLY_COMMITTED' | 'FAILED') {
  return (prisma as any).importBatch.update({
    where: { id: batchId },
    data: { status, completedAt: new Date() },
  })
}
