import { describe, expect, it } from '@jest/globals'
import { getAgentAuthRedirect } from '@/lib/auth/agentRedirect'

describe('agent auth gateway redirects', () => {
  it('sends an unverified registered agent to email verification', () => {
    expect(getAgentAuthRedirect({ status: 'REGISTERED', emailVerified: false, email: 'Agent@Example.com' }))
      .toBe('/agent/verify?email=Agent%40Example.com')
  })

  it('sends a verified registered agent to onboarding', () => {
    expect(getAgentAuthRedirect({ status: 'REGISTERED', emailVerified: true })).toBe('/agent/onboarding')
    expect(getAgentAuthRedirect({ status: 'EMAIL_VERIFIED', emailVerified: true })).toBe('/agent/onboarding')
  })

  it('does not send pending agents back to login or register', () => {
    const pendingDestinations = [
      getAgentAuthRedirect({ status: 'PROFILE_INCOMPLETE', emailVerified: true }),
      getAgentAuthRedirect({ status: 'PROFILE_COMPLETED', emailVerified: true }),
      getAgentAuthRedirect({ status: 'UNDER_REVIEW', emailVerified: true }),
    ]

    expect(pendingDestinations).toEqual(['/agent/profile', '/agent/verification', '/agent/on-hold?reason=under_review'])
    expect(pendingDestinations.some((path) => path.includes('/agent/auth'))).toBe(false)
  })

  it('sends approved agents to the dashboard', () => {
    expect(getAgentAuthRedirect({ status: 'APPROVED', emailVerified: true })).toBe('/agent/dashboard')
  })
})