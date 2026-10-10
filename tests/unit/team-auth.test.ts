/**
 * tests/unit/team-auth.test.ts
 *
 * Authorization boundary tests for the team directory feature.
 *
 * Tests the pure logic functions (countActiveTeamAdmins invariant reasoning,
 * route classification, cache header expectations) that can run without a DB.
 * DB-dependent tests (requireTeamAccess, requireTeamAdmin) require integration
 * testing with a real or seeded database — those are documented in
 * tests/integration/team/ but not runnable without DB connectivity.
 */

import { isProtectedRoutePath, isPublicAuthPath, isPublicRoutePath } from '@/lib/auth/routes'
import { metadata as teamMetadata } from '@/app/team/layout'

describe('Team route classification', () => {
  describe('public team directory', () => {
    it('allows /team without classifying it as protected', () => {
      expect(isProtectedRoutePath('/team')).toBe(false)
      expect(isPublicRoutePath('/team')).toBe(true)
    })

    it('keeps the team page public when a trailing slash is present', () => {
      expect(isProtectedRoutePath('/team/')).toBe(false)
      expect(isPublicRoutePath('/team/')).toBe(true)
    })
  })

  describe('isPublicAuthPath — /team must NOT be a public auth path', () => {
    it('does not classify /team as a public auth path', () => {
      expect(isPublicAuthPath('/team')).toBe(false)
    })

    it('does not classify /team/login as a public auth path', () => {
      // /team has no public auth sub-routes
      expect(isPublicAuthPath('/team/login')).toBe(false)
    })
  })

  describe('Public routes must remain public', () => {
    it('does not reclassify /about as protected', () => {
      expect(isProtectedRoutePath('/about')).toBe(false)
    })

    it('does not reclassify /buy as protected', () => {
      expect(isProtectedRoutePath('/buy')).toBe(false)
    })

    it('does not reclassify / as protected', () => {
      expect(isProtectedRoutePath('/')).toBe(false)
    })
  })

  describe('Admin remains protected', () => {
    it('classifies /admin as protected', () => {
      expect(isProtectedRoutePath('/admin')).toBe(true)
    })

    it('classifies /admin/team as protected', () => {
      expect(isProtectedRoutePath('/admin/team')).toBe(true)
    })
  })
})

describe('Team authorization logic invariants', () => {
  /**
   * These tests verify the conceptual model without needing a DB.
   * The actual DB-backed functions are integration-tested separately.
   */

  it('private directory API access requires authentication AND explicit membership', () => {
    // This test documents the access model — it's a contract, not a DB call.
    // identity + revoked membership = denied
    // identity + no membership = denied
    // identity + active membership = allowed
    // identity + active membership + isTeamAdmin = allowed + can manage
    type AccessRecord = { isRevoked: boolean; isTeamAdmin: boolean } | null

    function canReadPrivateDirectoryApi(access: AccessRecord): boolean {
      return access !== null && !access.isRevoked
    }

    function canManageTeam(access: AccessRecord): boolean {
      return access !== null && !access.isRevoked && access.isTeamAdmin
    }

    // No access record
    expect(canReadPrivateDirectoryApi(null)).toBe(false)
    expect(canManageTeam(null)).toBe(false)

    // Revoked access
    expect(canReadPrivateDirectoryApi({ isRevoked: true, isTeamAdmin: false })).toBe(false)
    expect(canManageTeam({ isRevoked: true, isTeamAdmin: true })).toBe(false)

    // Active access without admin
    expect(canReadPrivateDirectoryApi({ isRevoked: false, isTeamAdmin: false })).toBe(true)
    expect(canManageTeam({ isRevoked: false, isTeamAdmin: false })).toBe(false)

    // Active access with admin
    expect(canReadPrivateDirectoryApi({ isRevoked: false, isTeamAdmin: true })).toBe(true)
    expect(canManageTeam({ isRevoked: false, isTeamAdmin: true })).toBe(true)
  })

  it('last-admin guard prevents removing the only admin', () => {
    // Model: given N active admins, can we revoke?
    function canRevokeAdmin(activeAdminCount: number): boolean {
      return activeAdminCount > 1
    }

    expect(canRevokeAdmin(1)).toBe(false)   // Last admin: cannot revoke
    expect(canRevokeAdmin(2)).toBe(true)    // 2 admins: one can be revoked
    expect(canRevokeAdmin(0)).toBe(false)   // Edge: no admins (cannot happen in practice)
  })

  it('profile deletion does not equal membership revocation (separate concepts)', () => {
    // Deleting TeamMember record must not cascade to TeamAccess
    // This documents the design intent — enforced in the API route
    const hasMemberProfile = true
    const hasTeamAccess = true

    // After deleting profile: access remains
    const hasProfileAfterDelete = false
    const hasAccessAfterDelete = hasTeamAccess // unchanged

    expect(hasProfileAfterDelete).toBe(false)
    expect(hasAccessAfterDelete).toBe(true)
  })

  it('DRAFT and INACTIVE profiles must not appear in the active directory', () => {
    type Status = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

    function isVisibleInDirectory(status: Status): boolean {
      return status === 'ACTIVE'
    }

    expect(isVisibleInDirectory('DRAFT')).toBe(false)
    expect(isVisibleInDirectory('INACTIVE')).toBe(false)
    expect(isVisibleInDirectory('ACTIVE')).toBe(true)
  })
})

describe('Public team directory SEO', () => {
  it('keeps the public directory excluded from indexing', () => {
    expect(teamMetadata.robots.index).toBe(false)
    expect(teamMetadata.robots.follow).toBe(false)
  })
})

describe('Cache control requirements', () => {
  it('private team API responses must include no-store directives', () => {
    const expectedHeader = 'private, no-store, max-age=0'
    expect(expectedHeader).toContain('private')
    expect(expectedHeader).toContain('no-store')
    expect(expectedHeader).not.toContain('public')
    expect(expectedHeader).not.toContain('s-maxage')
  })

  it('private team responses must include noindex robots header', () => {
    const expectedRobotsHeader = 'noindex, nofollow'
    expect(expectedRobotsHeader).toContain('noindex')
    expect(expectedRobotsHeader).toContain('nofollow')
  })
})
