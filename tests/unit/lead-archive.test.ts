import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { setLeadArchived } from '@/lib/leads/adminLifecycle'
import { buildLeadWhere } from '@/lib/leads/queries'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('lead archival', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('excludes archived leads by default and can filter them explicitly', () => {
    expect(buildLeadWhere({}).deletedAt).toBeNull()
    expect(buildLeadWhere({ archived: false }).deletedAt).toBeNull()
    expect(buildLeadWhere({ archived: true }).deletedAt).toEqual({ not: null })
  })

  it('writes archive state and audit atomically', async () => {
    const tx: any = {
      lead: {
        findUnique: jest.fn<() => Promise<{ id: string; deletedAt: null }>>().mockResolvedValue({ id: 'lead-1', deletedAt: null }),
        updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'audit-1' }) },
    }
    mockedPrisma.$transaction.mockImplementation((callback: (client: unknown) => unknown) => callback(tx))

    await expect(setLeadArchived({ leadId: 'lead-1', actorId: 'admin-1', archived: true }))
      .resolves.toMatchObject({ kind: 'updated', deletedAt: expect.any(Date) })

    expect(tx.lead.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1', deletedAt: null },
      data: { deletedAt: expect.any(Date), deletedBy: 'admin-1' },
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        entityType: 'LEAD',
        entityId: 'lead-1',
        action: 'LEAD_ARCHIVED',
        beforeState: { archived: false },
        afterState: { archived: true },
      }),
    }))
  })
})
