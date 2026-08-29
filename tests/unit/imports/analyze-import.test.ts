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

  it('marks the batch failed when synchronous analysis cannot load records', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', entityType: 'PROPERTY', status: 'READY_FOR_REVIEW' })
    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importIssue.deleteMany.mockResolvedValue({ count: 2 })
    mockedPrisma.importRecord.findMany.mockRejectedValue(new Error('Database unavailable'))

    await expect(analyzeImportBatch({ batchId: 'batch-1', waitForCompletion: true })).rejects.toThrow('Database unavailable')
    expect(mockedPrisma.importBatch.update).toHaveBeenLastCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    })
  })

  it('returns an analyzing status immediately when analysis is queued in the background', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', entityType: 'PROPERTY', status: 'READY_FOR_REVIEW', totalRecords: 5 })
    mockedPrisma.importBatch.update.mockResolvedValue({})

    await expect(analyzeImportBatch({ batchId: 'batch-1' })).resolves.toEqual({
      batchId: 'batch-1',
      status: 'ANALYZING',
      total: 5,
      ready: 0,
      warnings: 0,
      errors: 0,
    })
    expect(mockedPrisma.importRecord.findMany).toHaveBeenCalled()
  })

  it('returns the existing result when analysis is retried after readiness', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'READY_TO_COMMIT',
      totalRecords: 3,
      readyCount: 3,
      warningCount: 0,
      errorCount: 0,
    })

    await expect(analyzeImportBatch({ batchId: 'batch-1' })).resolves.toEqual({
      batchId: 'batch-1',
      status: 'READY_TO_COMMIT',
      total: 3,
      ready: 3,
      warnings: 0,
      errors: 0,
    })
    expect(mockedPrisma.importBatch.update).not.toHaveBeenCalled()
    expect(mockedPrisma.importRecord.findMany).not.toHaveBeenCalled()
  })
})
