import { describe, expect, it } from '@jest/globals'
import {
  AI_LOGIN_CONTROLLED_ROUTES,
  isAiLoginControlledRoute,
} from '@/lib/ai-public-routes'

describe('AI login-controlled route registry', () => {
  it('contains exactly the six owner-approved information page roots', () => {
    expect(AI_LOGIN_CONTROLLED_ROUTES).toEqual([
      '/ai/view',
      '/ai/shield',
      '/ai/index',
      '/ai/title',
      '/ai/pro',
      '/ai-system',
    ])
  })

  it.each(AI_LOGIN_CONTROLLED_ROUTES)(
    'matches the canonical route %s',
    (route) => {
      expect(isAiLoginControlledRoute(route)).toBe(true)
      expect(isAiLoginControlledRoute(`${route}/`)).toBe(true)
    },
  )

  it('matches the existing informational descendant /ai/shield/about', () => {
    const route = '/ai/shield/about'
    expect(isAiLoginControlledRoute(route)).toBe(true)
  })

  it.each([
    '/ai',
    '/ai/analytics',
    '/ai/index/demo',
    '/ai/view/demo/preview',
    '/ai-admin',
    '/ai-demos/aiview_demo.html',
    '/api/ai/investment',
    '/api/ai-shield/projects',
    '/dashboard',
    '/AI/pro',
  ])('does not match an unrelated or protected route %s', (route) => {
    expect(isAiLoginControlledRoute(route)).toBe(false)
  })
})
