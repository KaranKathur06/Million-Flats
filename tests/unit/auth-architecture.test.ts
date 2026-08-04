import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { buildAbsoluteUrl, getBaseUrl, isProtectedRoutePath, isPublicAuthPath } from '@/lib/auth/routes'

describe('auth architecture helpers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('treats admin reset-password as a public auth route', () => {
    expect(isPublicAuthPath('/admin/reset-password')).toBe(true)
    expect(isPublicAuthPath('/admin/users')).toBe(false)
  })

  it('protects admin and dashboard routes', () => {
    expect(isProtectedRoutePath('/admin/users')).toBe(true)
    expect(isProtectedRoutePath('/dashboard')).toBe(true)
    expect(isProtectedRoutePath('/about')).toBe(false)
  })

  it('builds absolute URLs from the centralized environment helper', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://stage.millionflats.com'
    expect(getBaseUrl()).toBe('https://stage.millionflats.com')
    expect(buildAbsoluteUrl('/admin/reset-password?token=abc')).toBe('https://stage.millionflats.com/admin/reset-password?token=abc')
  })
})
