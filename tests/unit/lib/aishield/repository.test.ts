import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIShieldResult: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { findAiShieldResult, listAiShieldResults, upsertAiShieldResult } from '@/lib/aishield/repository'

const mockedPrisma = prisma as unknown as {
  aIShieldResult: {
    findUnique: jest.Mock
    findMany: jest.Mock
    upsert: jest.Mock
  }
}

describe('aishield repository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('falls back when the ai shield table is missing', async () => {
    mockedPrisma.aIShieldResult.findUnique.mockRejectedValueOnce(new Error('The table "public.ai_shield_results" does not exist in the current database.'))

    await expect(findAiShieldResult('PROJECT', 'project-1')).resolves.toBeNull()
  })

  it('uses the generated prisma model name for AIShieldResult queries', async () => {
    mockedPrisma.aIShieldResult.findMany.mockResolvedValueOnce([])

    await expect(listAiShieldResults('PROJECT')).resolves.toEqual([])
    expect(mockedPrisma.aIShieldResult.findMany).toHaveBeenCalledWith({
      where: { entityType: 'PROJECT' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('upserts through the generated prisma model name', async () => {
    mockedPrisma.aIShieldResult.upsert.mockResolvedValueOnce({ id: '1' })

    await expect(upsertAiShieldResult('PROJECT', 'project-1', { confidence: 1 })).resolves.toEqual({ id: '1' })
    expect(mockedPrisma.aIShieldResult.upsert).toHaveBeenCalledWith({
      where: { entityType_entityId: { entityType: 'PROJECT', entityId: 'project-1' } },
      create: { entityType: 'PROJECT', entityId: 'project-1', confidence: 1 },
      update: { confidence: 1 },
    })
  })
})
