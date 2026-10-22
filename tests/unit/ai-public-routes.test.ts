import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { isAiPublicPagePath, isAiPublicPagesEnabled, AI_PUBLIC_PAGE_PREFIXES } from '@/lib/ai-public-routes'

// ─── isAiPublicPagePath ────────────────────────────────────────────────────────

describe('isAiPublicPagePath', () => {
  // Canonical exact matches
  it.each([
    '/ai/view',
    '/ai/shield',
    '/ai/index',
    '/ai/title',
    '/ai/pro',
    '/ai-system',
  ])('returns true for exact path %s', (path) => {
    expect(isAiPublicPagePath(path)).toBe(true)
  })

  // Sub-path matches
  it.each([
    '/ai/view/about',
    '/ai/shield/faq',
    '/ai/index/overview',
    '/ai/title/how-it-works',
    '/ai/pro/pricing',
    '/ai-system/overview',
  ])('returns true for sub-path %s', (path) => {
    expect(isAiPublicPagePath(path)).toBe(true)
  })

  // Trailing slash — should still match
  it.each([
    '/ai/view/',
    '/ai/shield/',
    '/ai/pro/',
    '/ai-system/',
  ])('returns true for trailing-slash path %s', (path) => {
    expect(isAiPublicPagePath(path)).toBe(true)
  })

  // Paths that must NOT match
  it.each([
    '/api/ai/report',          // API route — not a public page
    '/api/ai/shield/value',    // API route
    '/ai-admin',               // substring match prevention
    '/ai-analytics',           // different section
    '/ai',                     // no trailing segment — not in allowlist
    '/dashboard',              // protected buyer dashboard
    '/admin',                  // admin portal
    '/agent/analytics',        // protected agent route
    '/developer',              // protected developer portal
  ])('returns false for non-AI-page path %s', (path) => {
    expect(isAiPublicPagePath(path)).toBe(false)
  })
})

// ─── isAiPublicPagesEnabled ───────────────────────────────────────────────────

describe('isAiPublicPagesEnabled', () => {
  const originalEnv = process.env.MF_AI_PUBLIC_PAGES

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MF_AI_PUBLIC_PAGES
    } else {
      process.env.MF_AI_PUBLIC_PAGES = originalEnv
    }
  })

  it('returns true when MF_AI_PUBLIC_PAGES is "true"', () => {
    process.env.MF_AI_PUBLIC_PAGES = 'true'
    expect(isAiPublicPagesEnabled()).toBe(true)
  })

  it('returns false when MF_AI_PUBLIC_PAGES is "false"', () => {
    process.env.MF_AI_PUBLIC_PAGES = 'false'
    expect(isAiPublicPagesEnabled()).toBe(false)
  })

  it('returns false when MF_AI_PUBLIC_PAGES is absent (secure default)', () => {
    delete process.env.MF_AI_PUBLIC_PAGES
    expect(isAiPublicPagesEnabled()).toBe(false)
  })

  it('returns false for any non-"true" string value', () => {
    for (const value of ['1', 'yes', 'TRUE', 'True', '']) {
      process.env.MF_AI_PUBLIC_PAGES = value
      expect(isAiPublicPagesEnabled()).toBe(false)
    }
  })
})

// ─── Allowlist completeness ────────────────────────────────────────────────────

describe('AI_PUBLIC_PAGE_PREFIXES', () => {
  it('contains exactly the six canonical AI System™ public page prefixes', () => {
    const expected = [
      '/ai/view',
      '/ai/shield',
      '/ai/index',
      '/ai/title',
      '/ai/pro',
      '/ai-system',
    ]
    expect([...AI_PUBLIC_PAGE_PREFIXES].sort()).toEqual(expected.sort())
  })

  it('contains no trailing slashes', () => {
    for (const prefix of AI_PUBLIC_PAGE_PREFIXES) {
      expect(prefix.endsWith('/')).toBe(false)
    }
  })

  it('does not include API routes', () => {
    for (const prefix of AI_PUBLIC_PAGE_PREFIXES) {
      expect(prefix.startsWith('/api/')).toBe(false)
    }
  })

  it('does not include protected portal prefixes', () => {
    const protectedPrefixes = ['/dashboard', '/admin', '/agent', '/developer', '/agency', '/user', '/settings']
    for (const aiPrefix of AI_PUBLIC_PAGE_PREFIXES) {
      for (const protectedPrefix of protectedPrefixes) {
        expect(aiPrefix.startsWith(protectedPrefix)).toBe(false)
      }
    }
  })
})
