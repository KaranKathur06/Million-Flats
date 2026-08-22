import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: { findUnique: jest.fn() },
    manualProperty: { create: jest.fn() },
  },
}))

import { createManualProperty } from '@/lib/manualPropertyService'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('manualPropertyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requires a valid agent owner before creating a manual property', async () => {
    await expect(createManualProperty({ agentId: '', title: 'Test Villa' })).rejects.toThrow('A valid Agent owner is required.')
  })

  it('rejects missing agents without creating a fallback agent record', async () => {
    const db = {
      agent: { findUnique: jest.fn<any>().mockResolvedValue(null) },
      manualProperty: { create: jest.fn() },
    }

    await expect(
      createManualProperty({ agentId: 'agent-123', title: 'Test Villa' }, { db: db as any })
    ).rejects.toThrow('The selected Agent owner does not exist.')

    expect(db.manualProperty.create).not.toHaveBeenCalled()
  })

  it('creates a manual property using manual source semantics and a safe default status', async () => {
    mockedPrisma.agent.findUnique.mockResolvedValue({ id: 'agent-123' })
    mockedPrisma.manualProperty.create.mockResolvedValue({ id: 'property-1' })

    const result = await createManualProperty({
      agentId: 'agent-123',
      title: 'Sunset Villa',
      city: 'Dubai',
      community: 'Downtown',
    })

    expect(mockedPrisma.manualProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'agent-123',
        sourceType: 'MANUAL',
        status: 'DRAFT',
        title: 'Sunset Villa',
        city: 'Dubai',
        community: 'Downtown',
        submittedAt: null,
      }),
    })

    expect(result.property).toEqual({ id: 'property-1' })
  })

  it('preserves an explicit status while keeping the property in the manual lifecycle contract', async () => {
    const db = {
      agent: { findUnique: jest.fn<any>().mockResolvedValue({ id: 'agent-123' }) },
      manualProperty: { create: jest.fn<any>().mockResolvedValue({ id: 'property-2' }) },
    }

    await createManualProperty(
      {
        agentId: 'agent-123',
        title: 'Approved Villa',
        status: 'PENDING_REVIEW',
      },
      { db: db as any }
    )

    expect(db.manualProperty.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: 'agent-123',
        sourceType: 'MANUAL',
        status: 'PENDING_REVIEW',
        title: 'Approved Villa',
      }),
    })
  })
})
