jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

jest.mock('@/lib/audit', () => ({
  writeAuditLog: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    importBatch: { findUnique: jest.fn(), update: jest.fn() },
    importRecord: { updateMany: jest.fn() },
    ecosystemPartner: { findMany: jest.fn(), deleteMany: jest.fn() },
    manualProperty: { findMany: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { rollbackImportBatch } from '@/lib/imports/core/rollback-import'
import { prisma } from '@/lib/prisma'

const db = prisma as any

function batch(entityType: string, records: unknown[]) {
  return {
    id: 'batch-1',
    entityType,
    status: 'PARTIALLY_COMMITTED',
    startedAt: '2026-08-28T10:00:00.000Z',
    completedAt: '2026-08-28T10:01:00.000Z',
    records,
  }
}

describe('import rollback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    db.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(db))
  })

  it('rolls back newly created ecosystem partners', async () => {
    db.importBatch.findUnique.mockResolvedValue(batch('ECOSYSTEM_PARTNER', [
      { commitAction: 'created', targetEntityId: 'partner-1' },
      { commitAction: 'updated', targetEntityId: 'partner-2' },
    ]))
    db.ecosystemPartner.findMany.mockResolvedValue([
      { id: 'partner-1', createdAt: '2026-08-28T10:00:10.000Z', updatedAt: '2026-08-28T10:00:10.000Z' },
    ])

    const result = await rollbackImportBatch({ batchId: 'batch-1', userId: 'admin-1' })

    expect(result).toEqual({ batchId: 'batch-1', status: 'CANCELLED', rolledBack: 1 })
    expect(db.ecosystemPartner.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['partner-1'] } } })
    expect(db.importRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { batchId: 'batch-1', targetEntityId: { in: ['partner-1'] }, commitAction: 'created' },
    }))
    expect(db.importBatch.update).toHaveBeenCalled()
  })

  it('blocks rollback when a created target changed after the batch completed', async () => {
    db.importBatch.findUnique.mockResolvedValue(batch('PROPERTY', [
      { commitAction: 'created', targetEntityId: 'property-1', manualPropertyId: 'property-1' },
    ]))
    db.manualProperty.findMany.mockResolvedValue([
      { id: 'property-1', createdAt: '2026-08-28T10:00:10.000Z', updatedAt: '2026-08-28T10:02:00.000Z' },
    ])

    await expect(rollbackImportBatch({ batchId: 'batch-1', userId: 'admin-1' }))
      .rejects.toThrow('Rollback blocked')
    expect(db.manualProperty.deleteMany).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})
