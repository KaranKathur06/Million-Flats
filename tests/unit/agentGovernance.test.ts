jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    agent: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/riskEngine', () => ({
  evaluateAgentRisk: jest.fn().mockResolvedValue({ score: 0, reasons: [], version: '1.0.0' }),
}))

jest.mock('@/lib/services/moderation.service', () => ({
  ensureModerationCase: jest.fn().mockResolvedValue({ id: 'case-1' }),
  addModerationAction: jest.fn().mockResolvedValue(undefined),
  setCaseRiskWithReasons: jest.fn().mockResolvedValue(undefined),
  setModerationQueue: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { approveAgent } from '@/lib/services/agentGovernance.service'

describe('approveAgent', () => {
  it('allows approval when the agent has already reached verification review', async () => {
    const updateMock = jest.fn().mockResolvedValue({
      id: 'agent-1',
      approved: true,
      profileStatus: 'VERIFIED',
      verificationStatus: 'APPROVED',
      status: 'APPROVED',
      userId: 'user-1',
    })

    ;(prisma as any).agent.findFirst.mockResolvedValue({
      id: 'agent-1',
      approved: false,
      profileStatus: 'VERIFIED',
      verificationStatus: 'UNDER_REVIEW',
      status: 'UNDER_REVIEW',
      userId: 'user-1',
      user: { status: 'ACTIVE', role: 'AGENT' },
    })

    ;(prisma as any).$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        agent: { update: updateMock },
        user: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ role: 'AGENT' }) },
      }
      return cb(tx)
    })

    const result = await approveAgent({
      agentId: 'agent-1',
      actorUserId: 'admin-1',
      actorRole: 'MODERATOR',
    })

    expect(result.ok).toBe(true)
    expect(result.message).toBeUndefined()
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'agent-1' },
      data: expect.objectContaining({ approved: true, profileStatus: 'VERIFIED' }),
    }))
  })
})
