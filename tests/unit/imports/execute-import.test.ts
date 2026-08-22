import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    importBatch: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    importRecord: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    importRequestIdempotency: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
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

describe('import commit orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

    expect(mockedPrisma.importBatch.updateMany).not.toHaveBeenCalled()
  })

  it('reports a missing batch before attempting to acquire the commit lock', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue(null)

    await expect(executeImport({ batchId: 'missing-batch', idempotencyKey: 'user-1:abc' }))
      .rejects.toThrow('Import batch not found.')

    expect(mockedPrisma.importBatch.updateMany).not.toHaveBeenCalled()
  })

  it('creates manual properties for eligible records and finalizes a successful batch commit', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT' })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        canonicalPayload: { agentId: 'agent-1', title: 'Palm Heights', city: 'Dubai' },
        sourceRow: 1,
      },
    ])

    mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        importRecord: {
          update: jest.fn<() => Promise<Record<string, never>>>().mockResolvedValue({}),
        },
      }
      const result = await callback(tx)
      return result
    })

    mockedCreateManualProperty.mockResolvedValue({
      property: { id: 'property-1' },
      affectedPaths: ['/buy', '/properties'],
    })

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:abc' })).resolves.toMatchObject({
      replayed: false,
      status: 'COMMITTED',
      created: 1,
      failed: 0,
    })

    expect(mockedCreateManualProperty).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'agent-1', title: 'Palm Heights' }),
      expect.objectContaining({ db: expect.any(Object) }),
    )
    expect(mockedPrisma.importBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'batch-1' },
        data: expect.objectContaining({ createdCount: 1, failedCount: 0 }),
      }),
    )
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/buy')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/properties')
  })

  it('releases the commit lock when loading records fails unexpectedly', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT' })
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importRecord.findMany.mockRejectedValue(new Error('Database unavailable'))

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:failure' }))
      .rejects.toThrow('Database unavailable')

    expect(mockedPrisma.importBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    })
  })

  it('blocks strict batches when warning records remain unresolved', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT', mode: 'STRICT' })
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      { id: 'record-1', status: 'WARNING', canonicalPayload: { agentId: 'agent-1', title: 'Needs Review' }, sourceRow: 1 },
    ])

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:strict' }))
      .rejects.toThrow('Strict imports cannot commit unresolved warning records.')

    expect(mockedCreateManualProperty).not.toHaveBeenCalled()
    expect(mockedPrisma.importBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: expect.objectContaining({ status: 'FAILED' }),
    })
  })

  it('skips a record when its deterministic provider listing identity already exists', async () => {
    mockedPrisma.importRequestIdempotency.findUnique.mockResolvedValue(null)
    mockedPrisma.importBatch.findUnique.mockResolvedValue({ id: 'batch-1', status: 'READY_TO_COMMIT', mode: 'PARTIAL' })
    mockedPrisma.importBatch.updateMany.mockResolvedValue({ count: 1 })
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        canonicalPayload: {
          agentId: 'agent-1',
          title: 'Existing Villa',
          sourceProvider: 'PORTAL',
          sourceListingId: 'portal-123',
        },
        sourceRow: 1,
      },
    ])
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback({
      manualProperty: {
        findFirst: jest.fn<any>().mockResolvedValue({ id: 'property-existing' }),
      },
      importRecord: {
        update: jest.fn<any>().mockResolvedValue({}),
      },
    }))

    await expect(executeImport({ batchId: 'batch-1', idempotencyKey: 'user-1:duplicate' })).resolves.toMatchObject({
      status: 'COMMITTED',
      created: 0,
      skipped: 1,
      failed: 0,
    })

    expect(mockedCreateManualProperty).not.toHaveBeenCalled()
  })
})
