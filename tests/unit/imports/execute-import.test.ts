import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    importBatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    agent: { findUnique: jest.fn() },
    importRecord: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    importRequestIdempotency: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/manualPropertyService', () => ({
  createManualProperty: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

import { executeImport } from '@/lib/imports/core/execute-import'
import { prisma } from '@/lib/prisma'
import { createManualProperty } from '@/lib/manualPropertyService'
import { revalidatePath } from 'next/cache'

const mockedPrisma = prisma as any
const mockedCreateManualProperty = createManualProperty as jest.MockedFunction<typeof createManualProperty>
const mockedRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>
const recordUpdateCalls: Array<{ where: unknown; data: Record<string, unknown> }> = []
const batchUpdateCalls: Array<{ where: unknown; data: Record<string, unknown> }> = []

function createTransaction(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: jest.fn<any>().mockResolvedValue(1),
    importRecord: {
      update: jest.fn<any>().mockImplementation(async (args: { where: unknown; data: Record<string, unknown> }) => {
        recordUpdateCalls.push(args)
        return {}
      }),
    },
    importBatch: {
      update: jest.fn<any>().mockImplementation(async (args: { where: unknown; data: Record<string, unknown> }) => {
        batchUpdateCalls.push(args)
        return {}
      }),
    },
    ...overrides,
  }
}

describe('import commit orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    recordUpdateCalls.length = 0
    batchUpdateCalls.length = 0
    mockedPrisma.$queryRaw.mockResolvedValue([{ id: 'batch-1' }])
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importRecord.update.mockResolvedValue({})
    mockedPrisma.agent.findUnique.mockResolvedValue({ id: 'agent-1', status: 'APPROVED', approved: true })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(createTransaction()))
  })

  it('replays a known idempotent commit response without acquiring a new lock', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue({
      response: { batchId: 'batch-1', status: 'COMMITTED', created: 1, failed: 0 },
    })

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:abc' })).resolves.toMatchObject({
      replayed: true,
      status: 'COMMITTED',
      created: 1,
      failed: 0,
    })

    expect(mockedPrisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('reports a missing batch before attempting to acquire the commit lock', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue(null)

    await expect(executeImport({ batchId: 'missing-batch', idempotencyKey: 'user-1:abc' }))
      .rejects.toThrow('Import batch not found.')

    expect(mockedPrisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('rejects a recent COMMITTING attempt when the atomic claim is unavailable', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'COMMITTING',
      entityType: 'PROJECT',
      adapterVersion: null,
    })
    mockedPrisma.$queryRaw.mockResolvedValue([])

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:active' }))
      .rejects.toThrow('Import batch is actively committing or has not been idle for 10 minutes.')
    expect(mockedPrisma.importBatch.updateMany).not.toHaveBeenCalled()
  })

  it('reconciles a stale batch when every record was already committed before interruption', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'COMMITTING',
      entityType: 'PROPERTY',
      adapterVersion: null,
      errorCount: 0,
    })
    mockedPrisma.importRecord.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ status: 'COMMITTED', commitAction: 'created' }])

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:reconcile' })).resolves.toMatchObject({
      status: 'COMMITTED',
      created: 1,
      attempted: 0,
      reconciled: true,
    })
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'COMMITTING' }),
      data: expect.objectContaining({ status: 'COMMITTED' }),
    }))
  })

  it('commits eligible records and finalizes a successful batch', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT', entityType: 'PROPERTY', mode: 'PARTIAL' })
    mockedPrisma.importRecord.findMany
      .mockResolvedValueOnce([{
        id: 'record-1',
        status: 'READY',
        canonicalPayload: { agentId: 'agent-1', title: 'Palm Heights', city: 'Dubai' },
        sourceRow: 1,
      }])
      .mockResolvedValueOnce([{ status: 'COMMITTED', commitAction: 'created' }])

    mockedCreateManualProperty.mockResolvedValue({
      property: { id: 'property-1' },
      affectedPaths: ['/buy', '/properties'],
    })

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:abc' })).resolves.toMatchObject({
      replayed: false,
      status: 'COMMITTED',
      created: 1,
      failed: 0,
      attempted: 1,
    })

    expect(mockedCreateManualProperty).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'agent-1', title: 'Palm Heights' }),
      expect.objectContaining({ db: expect.any(Object) }),
    )
    expect(batchUpdateCalls).toContainEqual(expect.objectContaining({
      where: { id: 'batch-1' },
      data: expect.objectContaining({ createdCount: 1, failedCount: 0 }),
    }))
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/buy')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/properties')
  })

  it('retries failed and ready rows, excludes committed rows, and reports cumulative outcomes', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'PARTIALLY_COMMITTED',
      entityType: 'PROPERTY',
      mode: 'PARTIAL',
      errorCount: 0,
      operation: 'UPSERT',
    })
    mockedPrisma.importRecord.findMany
      .mockResolvedValueOnce([
        { id: 'already-done', status: 'COMMITTED', commitAction: 'created', canonicalPayload: { title: 'Done' } },
        { id: 'retry-error', status: 'ERROR', commitAction: 'COMMIT_FAILED', canonicalPayload: { agentId: 'agent-1', title: 'Retry' }, sourceRecordId: 'retry-1' },
        { id: 'still-ready', status: 'READY', canonicalPayload: { agentId: 'agent-1', title: 'Next' }, sourceRecordId: 'next-1' },
      ])
      .mockResolvedValueOnce([
        { status: 'COMMITTED', commitAction: 'created' },
        { status: 'COMMITTED', commitAction: 'created' },
        { status: 'COMMITTED', commitAction: 'updated' },
      ])
    mockedCreateManualProperty.mockResolvedValue({
      property: { id: 'new-property' },
      affectedPaths: [],
    })

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:resume' })).resolves.toMatchObject({
      status: 'COMMITTED',
      created: 2,
      updated: 1,
      failed: 0,
      attempted: 2,
    })

    expect(mockedCreateManualProperty).toHaveBeenCalledTimes(2)
    expect(mockedCreateManualProperty).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Done' }), expect.anything())
  })

  it('persists a retry failure reason and keeps the batch resumable', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'FAILED',
      entityType: 'PROPERTY',
      mode: 'PARTIAL',
      errorCount: 0,
      operation: 'CREATE',
    })
    mockedPrisma.importRecord.findMany
      .mockResolvedValueOnce([{
        id: 'record-failed',
        status: 'ERROR',
        commitAction: 'COMMIT_FAILED',
        canonicalPayload: { agentId: 'agent-1', title: 'Retry' },
        sourceRecordId: 'retry-1',
      }])
      .mockResolvedValueOnce([{ status: 'ERROR', commitAction: 'COMMIT_FAILED' }])
    mockedCreateManualProperty.mockRejectedValue(new Error('Database unavailable'))

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:retry-failed' })).resolves.toMatchObject({
      status: 'FAILED',
      failed: 1,
      attempted: 1,
    })

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(3)
    expect(recordUpdateCalls).toContainEqual(expect.objectContaining({
      where: { id: 'record-failed' },
      data: expect.objectContaining({
        status: 'ERROR',
        commitAction: 'COMMIT_FAILED',
        commitFailureReason: 'Database unavailable',
      }),
    }))
  })

  it('blocks strict batches when warning records remain unresolved', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT', entityType: 'PROPERTY', mode: 'STRICT' })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', status: 'WARNING', canonicalPayload: { agentId: 'agent-1', title: 'Needs Review' }, sourceRow: 1 },
    ])

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:strict' }))
      .rejects.toThrow('Strict imports cannot commit unresolved warning records.')

    expect(mockedCreateManualProperty).not.toHaveBeenCalled()
    expect(mockedPrisma.importBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'batch-1', status: 'COMMITTING' }),
      data: expect.objectContaining({ status: 'FAILED' }),
    }))
  })

  it('skips a record when its deterministic provider listing identity already exists', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT', entityType: 'PROPERTY', mode: 'PARTIAL' })
    mockedPrisma.importRecord.findMany
      .mockResolvedValueOnce([{
        id: 'record-1',
        status: 'READY',
        canonicalPayload: { agentId: 'agent-1', title: 'Existing Villa', sourceProvider: 'PORTAL', sourceListingId: 'portal-123' },
        sourceRow: 1,
      }])
      .mockResolvedValueOnce([{ status: 'COMMITTED', commitAction: 'skipped' }])
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback(createTransaction({
      manualProperty: { findFirst: jest.fn<any>().mockResolvedValue({ id: 'property-existing' }) },
    })))

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:duplicate' })).resolves.toMatchObject({
      status: 'COMMITTED',
      created: 0,
      skipped: 1,
      failed: 0,
    })

    expect(mockedCreateManualProperty).not.toHaveBeenCalled()
  })
})
