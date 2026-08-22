import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    importBatch: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import { cancelImportBatch } from '@/lib/imports/core/cancel-import'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('import batch cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cancels only a non-terminal batch atomically', async () => {
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })

    await expect(cancelImportBatch({ batchId: 'batch-1', userId: 'admin-1' })).resolves.toEqual({
      batchId: 'batch-1',
      status: 'CANCELLED',
    })

    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: { in: expect.arrayContaining(['READY_FOR_REVIEW', 'READY_TO_COMMIT']) } },
      data: expect.objectContaining({ status: 'CANCELLED', cancelledByUserId: 'admin-1' }),
    }))
  })

  it('distinguishes a missing batch from a terminal batch', async () => {
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.importBatch.findUnique.mockResolvedValueOnce(null)

    await expect(cancelImportBatch({ batchId: 'missing', userId: 'admin-1' })).rejects.toThrow('Import batch not found.')

    mockedPrisma.importBatch.findUnique.mockResolvedValueOnce({ id: 'batch-2' })
    await expect(cancelImportBatch({ batchId: 'batch-2', userId: 'admin-1' })).rejects.toThrow('Import batch cannot be cancelled in its current state.')
  })
})
