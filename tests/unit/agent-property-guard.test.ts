import { describe, expect, it } from '@jest/globals'
import { buildAgentPropertyGuardPayload } from '@/lib/agentPropertyGuard'

describe('agent property guard payload', () => {
  it('allows verified agents within plan limits', () => {
    const result = buildAgentPropertyGuardPayload({
      agent: {
        status: 'APPROVED',
        verificationStatus: 'VERIFIED',
        documentsRequiredAt: null,
        subscription: { plan: 'PRO', status: 'ACTIVE' },
        _count: { manualProperties: 0 },
      },
    })

    expect(result.allowed).toBe(true)
    expect(result.agentStatus).toBe('APPROVED')
  })

  it('blocks agents that are not approved', () => {
    const result = buildAgentPropertyGuardPayload({
      agent: {
        status: 'REGISTERED',
        verificationStatus: 'PENDING',
        documentsRequiredAt: null,
        subscription: { plan: 'PRO', status: 'ACTIVE' },
        _count: { manualProperties: 0 },
      },
    })

    expect(result.allowed).toBe(false)
    expect(result.code).toBe('NOT_APPROVED')
  })
})
