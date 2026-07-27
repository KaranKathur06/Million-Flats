import { isAgentPublicRoute } from '@/lib/agentPublicRoutes'

describe('isAgentPublicRoute', () => {
  it('treats forgot-password and reset-password as public agent auth routes', () => {
    expect(isAgentPublicRoute('/agent/forgot-password')).toBe(true)
    expect(isAgentPublicRoute('/agent/reset-password')).toBe(true)
    expect(isAgentPublicRoute('/agent/forgot-password/reset-token')).toBe(true)
  })

  it('keeps protected agent routes outside the public auth scope', () => {
    expect(isAgentPublicRoute('/agent/dashboard')).toBe(false)
    expect(isAgentPublicRoute('/agent/profile')).toBe(false)
    expect(isAgentPublicRoute('/agent/onboarding')).toBe(true)
  })
})
