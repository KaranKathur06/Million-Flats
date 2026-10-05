import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    importBatch: { updateMany: jest.fn() },
  },
}))

import {
  claimImportAnalysisAttempt,
  markImportAnalysisRetrying,
  refreshImportAnalysisHeartbeat,
  releaseImportAnalysisAttempt,
} from '@/lib/imports/core/analysis-lock'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('import analysis attempt locking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('claims stale analysis with a database-clock heartbeat guard', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ id: 'batch-1' }])

    await expect(claimImportAnalysisAttempt({
      batchId: 'batch-1',
      attemptId: 'attempt-1',
      mode: 'RECOVER',
    })).resolves.toBe(true)

    const [template, ...values] = mockedPrisma.$queryRaw.mock.calls[0]
    const sql = Array.from(template).join('')
    expect(sql).toContain('"status" = \'ANALYZING\'')
    expect(sql).toContain('COALESCE("analysis_heartbeat_at", "started_at", "updated_at")')
    expect(sql).toContain('clock_timestamp() - (')
    expect(sql).toContain('FOR UPDATE SKIP LOCKED')
    expect(sql).toContain('"analysis_processed_count"')
    expect(values).toEqual(['batch-1', false, true, 10, false, 'attempt-1', null])
  })

  it('does not claim a batch when another analysis attempt owns it', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([])

    await expect(claimImportAnalysisAttempt({
      batchId: 'batch-1',
      attemptId: 'attempt-2',
      mode: 'RECOVER',
    })).resolves.toBe(false)
  })

  it('moves only failed analysis batches into the retry state', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ id: 'batch-1' }])

    await expect(markImportAnalysisRetrying('batch-1')).resolves.toBe(true)

    const [template] = mockedPrisma.$queryRaw.mock.calls[0]
    const sql = Array.from(template).join('')
    expect(sql).toContain('"status" = \'FAILED\'')
    expect(sql).toContain('"failure_summary"->>\'stage\' = \'ANALYSIS\'')
    expect(sql).toContain('SET "status" = \'RETRYING\'')
  })

  it('rejects row progress when the analysis attempt no longer owns the batch', async () => {
    const tx = { $executeRaw: jest.fn<(...args: any[]) => Promise<number>>() }
    tx.$executeRaw.mockResolvedValue(0)

    await expect(refreshImportAnalysisHeartbeat(tx, 'batch-1', 'old-attempt', 3))
      .rejects.toThrow('Import analysis attempt lost ownership.')
  })

  it('releases only the matching analysis owner', async () => {
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })

    await expect(releaseImportAnalysisAttempt('batch-1', 'attempt-3', 'FAILED', {
      failureSummary: { stage: 'ANALYSIS', message: 'Temporary error' },
    })).resolves.toEqual({ count: 1 })

    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'ANALYZING', analysisAttemptId: 'attempt-3' },
      data: expect.objectContaining({
        status: 'FAILED',
        analysisAttemptId: null,
        failureSummary: { stage: 'ANALYSIS', message: 'Temporary error' },
      }),
    }))
  })
})
