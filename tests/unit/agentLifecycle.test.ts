import { resolveAgentStatus } from '@/lib/agentLifecycle'

describe('resolveAgentStatus', () => {
  it('resolves an approved flag to APPROVED even when legacy fields are under review', () => {
    expect(resolveAgentStatus({
      approved: true,
      status: 'UNDER_REVIEW',
      profileStatus: 'VERIFIED',
      verificationStatus: 'UNDER_REVIEW',
    })).toBe('APPROVED')
  })

  it('resolves the canonical approved status from verification approval', () => {
    expect(resolveAgentStatus({
      status: 'UNDER_REVIEW',
      verificationStatus: 'APPROVED',
    })).toBe('APPROVED')
  })

  it('does not turn rejected or suspended agents into approved agents', () => {
    expect(resolveAgentStatus({ approved: true, status: 'REJECTED' })).toBe('REJECTED')
    expect(resolveAgentStatus({ approved: true, status: 'SUSPENDED' })).toBe('SUSPENDED')
  })

  it('keeps normal onboarding status unchanged', () => {
    expect(resolveAgentStatus({ status: 'UNDER_REVIEW', profileStatus: 'SUBMITTED' })).toBe('UNDER_REVIEW')
    expect(resolveAgentStatus({ status: 'PROFILE_COMPLETED' })).toBe('PROFILE_COMPLETED')
  })
})
