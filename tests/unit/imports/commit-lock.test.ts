import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    importBatch: { updateMany: jest.fn() },
  },
}))

import { acquireImportCommitLock, refreshImportCommitHeartbeat } from '@/lib/imports/core/commit-lock'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('import commit attempt locking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('atomically claims eligible batches and uses the database clock for stale recovery', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ id: 'batch-1' }])

    await expect(acquireImportCommitLock('batch-1', 'attempt-1')).resolves.toBe(true)

    const [template, ...values] = mockedPrisma.$queryRaw.mock.calls[0]
    const sql = Array.from(template).join('')
    expect(sql).toContain('"status" = \'COMMITTING\'')
    expect(sql).toContain('"entity_type" IN (\'PROPERTY\', \'PROJECT\')')
    expect(sql).toContain('COALESCE("commit_heartbeat_at", "started_at", "updated_at")')
    expect(sql).toContain("clock_timestamp() - (")
    expect(sql).toContain("* INTERVAL '1 minute')")
    expect(sql).toContain('FOR UPDATE SKIP LOCKED')
    expect(values).toEqual(['batch-1', 10, 'attempt-1'])
  })

  it('does not claim a batch when the atomic update returns no row', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([])

    await expect(acquireImportCommitLock('batch-1', 'attempt-2')).resolves.toBe(false)
  })

  it('rejects record progress when the attempt no longer owns the batch', async () => {
    mockedPrisma.$executeRaw.mockResolvedValue(0)

    await expect(refreshImportCommitHeartbeat(mockedPrisma, 'batch-1', 'displaced-attempt'))
      .rejects.toThrow('Import commit attempt lost ownership.')
  })
})
