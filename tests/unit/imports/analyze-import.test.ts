import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    importBatch: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    importRecord: { findMany: jest.fn() },
    importIssue: { deleteMany: jest.fn(), createMany: jest.fn() },
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
import { getImportAdapterForEntity } from '@/lib/imports/registry'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any
const mockedGetAdapter = getImportAdapterForEntity as jest.MockedFunction<typeof getImportAdapterForEntity>
const adapter = {
  adapterVersion: 1,
  suggestMappings: jest.fn(() => []),
  normalize: jest.fn(() => ({ normalized: {}, warnings: [], errors: [] })),
  mapCanonical: jest.fn(() => ({ canonical: {}, warnings: [], errors: [], fieldConfidence: {} })),
  validate: jest.fn(() => ({ ready: true, warnings: [], errors: [] })),
  resolveRelations: jest.fn(async () => ({ ready: true, warnings: [], errors: [] })),
}
const tx = {
  $executeRaw: jest.fn<(...args: any[]) => Promise<number>>(),
  importRecord: { update: jest.fn<(...args: any[]) => Promise<any>>() },
  importIssue: {
    deleteMany: jest.fn<(...args: any[]) => Promise<any>>(),
    createMany: jest.fn<(...args: any[]) => Promise<any>>(),
  },
}

describe('import batch analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedPrisma.$queryRaw.mockResolvedValue([{ id: 'batch-1' }])
    mockedPrisma.$transaction.mockImplementation((work: (transaction: typeof tx) => unknown) => work(tx))
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importRecord.findMany.mockResolvedValue([])
    tx.$executeRaw.mockResolvedValue(1)
    tx.importRecord.update.mockResolvedValue({})
    tx.importIssue.deleteMany.mockResolvedValue({ count: 0 })
    tx.importIssue.createMany.mockResolvedValue({ count: 0 })
    mockedGetAdapter.mockReturnValue(adapter as any)
  })

  it('marks the batch failed when synchronous analysis cannot load records', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'READY_FOR_REVIEW',
      mode: 'PARTIAL',
      totalRecords: 1,
    })
    mockedPrisma.importRecord.findMany.mockRejectedValue(new Error('Database unavailable'))

    await expect(analyzeImportBatch({ batchId: 'batch-1', waitForCompletion: true })).rejects.toThrow('Database unavailable')
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({
        status: 'FAILED',
        failureSummary: { stage: 'ANALYSIS', message: 'Database unavailable' },
      }),
    }))
  })

  it('returns an analyzing status immediately when analysis is queued in the background', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'READY_FOR_REVIEW',
      mode: 'PARTIAL',
      totalRecords: 5,
    })

    await expect(analyzeImportBatch({ batchId: 'batch-1' })).resolves.toEqual({
      batchId: 'batch-1',
      status: 'ANALYZING',
      total: 5,
      ready: 0,
      warnings: 0,
      errors: 0,
    })
    expect(mockedPrisma.$queryRaw).toHaveBeenCalled()
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

  it('transitions an analysis failure through RETRYING before starting a new attempt', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'FAILED',
      mode: 'PARTIAL',
      totalRecords: 0,
      adapterVersion: 1,
      failureSummary: { stage: 'ANALYSIS', message: 'Database unavailable' },
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([])

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      requestMode: 'RETRY',
      waitForCompletion: true,
    })).resolves.toMatchObject({
      status: 'READY_TO_COMMIT',
      total: 0,
      ready: 0,
      warnings: 0,
      errors: 0,
    })

    expect(mockedPrisma.$queryRaw).toHaveBeenCalledTimes(2)
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({ status: 'READY_TO_COMMIT' }),
    }))
  })

  it('persists row outcomes and replaces open issues while retaining the selected owner', async () => {
    const batch = {
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 1,
      adapterVersion: 1,
      analysisOwnerAgentId: 'owner-1',
    }
    mockedPrisma.importBatch.findUnique.mockResolvedValue(batch)
    mockedPrisma.importRecord.findMany.mockResolvedValue([{
      id: 'record-1',
      sourceRow: 1,
      sourcePath: null,
      rawPayload: { title: 'Home' },
    }])
    adapter.normalize.mockReturnValue({ normalized: { title: 'Home' }, warnings: ['QUALITY_WARNING: verify details'], errors: [] })
    adapter.mapCanonical.mockReturnValue({ canonical: { agentId: null }, warnings: [], errors: [], fieldConfidence: {} })

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      ownerAgentId: 'different-owner',
      requestMode: 'RECOVER',
      waitForCompletion: true,
    })).resolves.toMatchObject({
      status: 'READY_FOR_REVIEW',
      total: 1,
      warnings: 1,
    })

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.$executeRaw.mock.calls[0][1]).toBe(1)
    expect(tx.importRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'record-1' },
      data: expect.objectContaining({
        canonicalPayload: { agentId: 'owner-1' },
        ownershipPolicy: 'configured-owner-agent',
        status: 'WARNING',
      }),
    }))
    expect(tx.importIssue.deleteMany).toHaveBeenCalledWith({
      where: { batchId: 'batch-1', recordId: 'record-1', stage: 'ANALYSIS', resolutionState: 'OPEN' },
    })
    expect(tx.importIssue.createMany).toHaveBeenCalledWith({
      data: [{
        batchId: 'batch-1',
        recordId: 'record-1',
        stage: 'ANALYSIS',
        severity: 'WARNING',
        code: 'QUALITY_WARNING',
        message: 'QUALITY_WARNING: verify details',
      }],
    })
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({
        status: 'READY_FOR_REVIEW',
        analysisAttemptId: null,
        warningCount: 1,
      }),
    }))
  })

  it('checkpoints each analyzed record in its own transaction and advances progress per commit', async () => {
    adapter.normalize.mockReturnValue({ normalized: {}, warnings: [], errors: [] })
    adapter.mapCanonical.mockReturnValue({ canonical: {}, warnings: [], errors: [], fieldConfidence: {} })
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 2,
      adapterVersion: 1,
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', sourceRow: 1, sourcePath: null, rawPayload: { title: 'First home' } },
      { id: 'record-2', sourceRow: 2, sourcePath: null, rawPayload: { title: 'Second home' } },
    ])

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      requestMode: 'RECOVER',
      waitForCompletion: true,
    })).resolves.toMatchObject({
      status: 'READY_TO_COMMIT',
      total: 2,
      ready: 2,
      warnings: 0,
      errors: 0,
    })

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2)
    expect(tx.$executeRaw.mock.calls.map((call) => call[1])).toEqual([1, 2])
    expect(tx.importRecord.update.mock.calls.map((call) => call[0].where.id)).toEqual(['record-1', 'record-2'])
    expect(tx.importIssue.deleteMany).toHaveBeenCalledTimes(2)
  })

  it('fails the analysis when a row checkpoint transaction fails', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 2,
      adapterVersion: 1,
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', sourceRow: 1, sourcePath: null, rawPayload: { title: 'First home' } },
      { id: 'record-2', sourceRow: 2, sourcePath: null, rawPayload: { title: 'Second home' } },
    ])
    mockedPrisma.$transaction.mockImplementationOnce((work: (transaction: typeof tx) => unknown) => work(tx))
      .mockImplementationOnce(() => Promise.reject(new Error('Transaction API error: Transaction not found')))

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      requestMode: 'RECOVER',
      waitForCompletion: true,
    })).rejects.toThrow('Transaction API error: Transaction not found')

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2)
    expect(tx.importRecord.update).toHaveBeenCalledTimes(1)
    expect(tx.$executeRaw.mock.calls.map((call) => call[1])).toEqual([1])
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({
        status: 'FAILED',
        failureSummary: { stage: 'ANALYSIS', message: 'Transaction API error: Transaction not found' },
      }),
    }))
  })

  it('retries P2028 in a fresh transaction with the same absolute progress checkpoint', async () => {
    adapter.normalize.mockReturnValue({ normalized: {}, warnings: [], errors: [] })
    adapter.mapCanonical.mockReturnValue({ canonical: {}, warnings: [], errors: [], fieldConfidence: {} })
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 1,
      adapterVersion: 1,
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', sourceRow: 1, sourcePath: null, rawPayload: { title: 'Home' } },
    ])
    const expiredTransaction = Object.assign(new Error('Transaction expired'), { code: 'P2028' })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockedPrisma.$transaction
      .mockImplementationOnce(async (work: (transaction: typeof tx) => unknown) => {
        await work(tx)
        throw expiredTransaction
      })
      .mockImplementationOnce((work: (transaction: typeof tx) => unknown) => work(tx))

    try {
      await expect(analyzeImportBatch({
        batchId: 'batch-1',
        requestMode: 'RECOVER',
        waitForCompletion: true,
      })).resolves.toMatchObject({
        status: 'READY_TO_COMMIT',
        total: 1,
        ready: 1,
      })

      expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2)
      expect(mockedPrisma.$transaction.mock.calls.map((call) => call[1])).toEqual([
        { timeout: 30_000 },
        { timeout: 30_000 },
      ])
      expect(tx.$executeRaw.mock.calls.map((call) => call[1])).toEqual([1, 1])
    } finally {
      warn.mockRestore()
    }
  })

  it('rechecks ownership before writes after retrying P2028', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 1,
      adapterVersion: 1,
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', sourceRow: 1, sourcePath: null, rawPayload: { title: 'Home' } },
    ])
    tx.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    const expiredTransaction = Object.assign(new Error('Transaction expired'), { code: 'P2028' })
    mockedPrisma.$transaction
      .mockImplementationOnce(async (work: (transaction: typeof tx) => unknown) => {
        await work(tx)
        throw expiredTransaction
      })
      .mockImplementationOnce((work: (transaction: typeof tx) => unknown) => work(tx))
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await expect(analyzeImportBatch({
        batchId: 'batch-1',
        requestMode: 'RECOVER',
        waitForCompletion: true,
      })).rejects.toThrow('Import analysis attempt lost ownership.')

      expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2)
      expect(tx.importRecord.update).toHaveBeenCalledTimes(1)
      expect(tx.importIssue.deleteMany).toHaveBeenCalledTimes(1)
      expect(mockedPrisma.importBatch.updateMany).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('stops after two P2028 retries and records the failure', async () => {
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'ANALYZING',
      mode: 'PARTIAL',
      totalRecords: 1,
      adapterVersion: 1,
    })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', sourceRow: 1, sourcePath: null, rawPayload: { title: 'Home' } },
    ])
    const expiredTransaction = Object.assign(new Error('Transaction expired'), { code: 'P2028' })
    mockedPrisma.$transaction.mockRejectedValue(expiredTransaction)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await expect(analyzeImportBatch({
        batchId: 'batch-1',
        requestMode: 'RECOVER',
        waitForCompletion: true,
      })).rejects.toThrow('Transaction expired')

      expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(3)
      expect(mockedPrisma.importBatch.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
        where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
        data: expect.objectContaining({
          status: 'FAILED',
          failureSummary: { stage: 'ANALYSIS', message: 'Transaction expired' },
        }),
      }))
    } finally {
      warn.mockRestore()
    }
  })
})
