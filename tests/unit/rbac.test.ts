import { getPortalForRole, hasPermission, isRoleAllowedForPortal, normalizeRole } from '@/lib/rbac'

describe('RBAC portal and permission resolution', () => {
  it('maps admin portal roles through a shared portal membership model', () => {
    expect(isRoleAllowedForPortal('SUPERADMIN', 'ADMIN')).toBe(true)
    expect(isRoleAllowedForPortal('MODERATOR', 'ADMIN')).toBe(true)
    expect(isRoleAllowedForPortal('VERIFIER', 'ADMIN')).toBe(true)
    expect(isRoleAllowedForPortal('AGENT', 'ADMIN')).toBe(false)
  })

  it('resolves the correct portal from a role', () => {
    expect(getPortalForRole('SUPERADMIN')).toBe('ADMIN')
    expect(getPortalForRole('AGENT')).toBe('AGENT')
    expect(getPortalForRole('BUYER')).toBe('USER')
  })

  it('checks permissions through centralized role definitions', () => {
    expect(hasPermission('SUPERADMIN', 'canManageUsers')).toBe(true)
    expect(hasPermission('ADMIN', 'canManageUsers')).toBe(true)
    expect(hasPermission('MODERATOR', 'canManageContent')).toBe(true)
    expect(hasPermission('VERIFIER', 'canVerifyAgents')).toBe(true)
    expect(hasPermission('VERIFIER', 'canManageUsers')).toBe(false)
  })

  it('normalizes legacy role values safely', () => {
    expect(normalizeRole(' superadmin ')).toBe('SUPERADMIN')
    expect(normalizeRole('unknown-role')).toBe('USER')
  })
})
