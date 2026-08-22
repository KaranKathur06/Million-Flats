import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: jest.fn() },
}))

import { invalidateImportBatch } from '@/lib/imports/core/invalidate-import'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('import batch invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clears stale record payloads after a mapping change and advances the mapping version', async () => {
    const tx = {
      importBatch: {
        findUnique: jest.fn<any>().mockResolvedValue({ id: 'batch-1', status: 'READY_FOR_REVIEW', mappingVersion: 2 }),
        update: jest.fn<any>().mockResolvedValue({ id: 'batch-1' }),
      },
      importRecord: { updateMany: jest.fn<any>().mockResolvedValue({ count: 4 }) },
    }
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx))

    await expect(invalidateImportBatch({ batchId: 'batch-1', change: 'mapping' })).resolves.toEqual({
      batchId: 'batch-1',
      status: 'READY_FOR_REVIEW',
      resetRecords: 4,
    })
    expect(tx.importRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'DISCOVERED', normalizedPayload: null, canonicalPayload: null }),
    }))
    expect(tx.importBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'READY_FOR_REVIEW', mappingVersion: 3 },
    }))
  })

  it('does not increment mapping version for an ownership change', async () => {
    const tx = {
      importBatch: {
        findUnique: jest.fn<any>().mockResolvedValue({ id: 'batch-2', status: 'READY_FOR_REVIEW', mappingVersion: 3 }),
        update: jest.fn<any>().mockResolvedValue({ id: 'batch-2' }),
      },
      importRecord: { updateMany: jest.fn<any>().mockResolvedValue({ count: 2 }) },
    }
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx))

    await expect(invalidateImportBatch({ batchId: 'batch-2', change: 'ownership' })).resolves.toMatchObject({
      batchId: 'batch-2',
      status: 'VALIDATING',
      resetRecords: 2,
    })
    expect(tx.importBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'VALIDATING', mappingVersion: 3 },
    }))
  })
})
