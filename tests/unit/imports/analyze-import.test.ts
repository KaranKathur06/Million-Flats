import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    importBatch: { findUnique: jest.fn(), update: jest.fn() },
    importRecord: { findMany: jest.fn() },
    importIssue: { deleteMany: jest.fn() },
  },
}))

jest.mock('@/lib/imports/registry', () => ({
  getImportAdapterForEntity: jest.fn(() => ({
    suggestMappings: jest.fn(() => []),
    normalize: jest.fn(),
    mapCanonical: jest.fn(),
    validate: jest.fn(),
  })),
}))

import { analyzeImportBatch } from '@/lib/imports/core/analyze-import'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('import batch analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks the batch failed when analysis cannot load records', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', entityType: 'PROPERTY', status: 'READY_FOR_REVIEW' })
    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importIssue.deleteMany.mockResolvedValue({ count: 2 })
    mockedPrisma.importRecord.findMany.mockRejectedValue(new Error('Database unavailable'))

    await expect(analyzeImportBatch({ batchId: 'batch-1' })).rejects.toThrow('Database unavailable')
    expect(mockedPrisma.importBatch.update).toHaveBeenLastCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    })
  })
})
