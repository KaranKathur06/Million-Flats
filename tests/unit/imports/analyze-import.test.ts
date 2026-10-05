import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    importBatch: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    importRecord: { findMany: jest.fn() },
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
let checkpointQuery: (...args: any[]) => Promise<any>
const adapter = {
  adapterVersion: 1,
  suggestMappings: jest.fn(() => []),
  normalize: jest.fn(() => ({ normalized: {}, warnings: [], errors: [] })),
  mapCanonical: jest.fn(() => ({ canonical: {}, warnings: [], errors: [], fieldConfidence: {} })),
  validate: jest.fn(() => ({ ready: true, warnings: [], errors: [] })),
  resolveRelations: jest.fn(async () => ({ ready: true, warnings: [], errors: [] })),
}
describe('import batch analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    checkpointQuery = async () => [{
      ownershipMatched: true,
      recordMatched: true,
      progressUpdated: true,
    }]
    mockedPrisma.$queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
      if (strings.join('').includes('import_analysis_record_checkpoint')) {
        return checkpointQuery(strings, ...values)
      }
      return Promise.resolve([{ id: 'batch-1' }])
    })
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importRecord.findMany.mockResolvedValue([])
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

    const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
      call[0].join('').includes('import_analysis_record_checkpoint'),
    )
    expect(checkpointCalls).toHaveLength(1)
    expect(checkpointCalls[0][0].join('')).toContain('"canonical_payload"')
    expect(checkpointCalls[0][0].join('')).toContain('DELETE FROM "import_issues"')
    expect(checkpointCalls[0][0].join('')).toContain('INSERT INTO "import_issues"')
    expect(checkpointCalls[0].slice(1)).toContain(JSON.stringify({ agentId: 'owner-1' }))
    expect(checkpointCalls[0].slice(1)).toContain(JSON.stringify([{
      batchId: 'batch-1',
      recordId: 'record-1',
      stage: 'ANALYSIS',
      severity: 'WARNING',
      code: 'QUALITY_WARNING',
      message: 'QUALITY_WARNING: verify details',
    }]))
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({
        status: 'READY_FOR_REVIEW',
        analysisAttemptId: null,
        warningCount: 1,
      }),
    }))
  })

  it('checkpoints each analyzed record with its own atomic statement and absolute progress value', async () => {
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

    const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
      call[0].join('').includes('import_analysis_record_checkpoint'),
    )
    expect(checkpointCalls).toHaveLength(2)
    expect(checkpointCalls[0][0].join('')).toContain('FOR UPDATE')
    expect(checkpointCalls[0][0].join('')).toContain('progress_updated')
    expect(checkpointCalls[0].slice(1)).toContain(1)
    expect(checkpointCalls[1].slice(1)).toContain(2)
  })

  it('fails the analysis after checkpoint P2028 retries are exhausted', async () => {
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
    const expiredTransaction = Object.assign(
      new Error('Transaction API error: Transaction not found'),
      { code: 'P2028' },
    )
    checkpointQuery = async () => { throw expiredTransaction }

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      requestMode: 'RECOVER',
      waitForCompletion: true,
    })).rejects.toThrow('Transaction API error: Transaction not found')

    const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
      call[0].join('').includes('import_analysis_record_checkpoint'),
    )
    expect(checkpointCalls).toHaveLength(3)
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: expect.any(String) },
      data: expect.objectContaining({
        status: 'FAILED',
        failureSummary: { stage: 'ANALYSIS', message: 'Transaction API error: Transaction not found' },
      }),
    }))
  })

  it('retries P2028 as a fresh atomic statement with the same absolute progress checkpoint', async () => {
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
    let callCount = 0
    checkpointQuery = async () => {
      callCount += 1
      if (callCount === 1) throw expiredTransaction
      return [{ ownershipMatched: true, recordMatched: true, progressUpdated: true }]
    }

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

      const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
        call[0].join('').includes('import_analysis_record_checkpoint'),
      )
      expect(checkpointCalls).toHaveLength(2)
      expect(checkpointCalls[0].slice(1)).toEqual(checkpointCalls[1].slice(1))
      expect(checkpointCalls[0][0].join('')).toContain('analysis_processed_count')
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
    const expiredTransaction = Object.assign(new Error('Transaction expired'), { code: 'P2028' })
    let callCount = 0
    checkpointQuery = async () => {
      callCount += 1
      if (callCount === 1) throw expiredTransaction
      return [{ ownershipMatched: false, recordMatched: false, progressUpdated: false }]
    }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await expect(analyzeImportBatch({
        batchId: 'batch-1',
        requestMode: 'RECOVER',
        waitForCompletion: true,
      })).rejects.toThrow('Import analysis attempt lost ownership.')

      const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
        call[0].join('').includes('import_analysis_record_checkpoint'),
      )
      expect(checkpointCalls).toHaveLength(2)
      expect(mockedPrisma.importBatch.updateMany).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('fails explicitly when the checkpoint cannot find the analyzed record', async () => {
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
    checkpointQuery = async () => [{
      ownershipMatched: true,
      recordMatched: false,
      progressUpdated: false,
    }]

    await expect(analyzeImportBatch({
      batchId: 'batch-1',
      requestMode: 'RECOVER',
      waitForCompletion: true,
    })).rejects.toThrow('Import analysis record record-1 was not found in batch batch-1.')

    const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
      call[0].join('').includes('import_analysis_record_checkpoint'),
    )
    expect(checkpointCalls).toHaveLength(1)
    expect(checkpointCalls[0][0].join('')).toContain('AND EXISTS (SELECT 1 FROM record_updated)')
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'FAILED',
        failureSummary: expect.objectContaining({ stage: 'ANALYSIS' }),
      }),
    }))
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
    checkpointQuery = async () => { throw expiredTransaction }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      await expect(analyzeImportBatch({
        batchId: 'batch-1',
        requestMode: 'RECOVER',
        waitForCompletion: true,
      })).rejects.toThrow('Transaction expired')

      const checkpointCalls = mockedPrisma.$queryRaw.mock.calls.filter((call: any[]) =>
        call[0].join('').includes('import_analysis_record_checkpoint'),
      )
      expect(checkpointCalls).toHaveLength(3)
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
