/**
 * Verification Service Unit Tests
 *
 * Tests the centralized VerificationService that handles OTP lifecycle
 * management across all portals (User, Agent, Developer, Agency).
 */

import { generateSecureOtp, signToken, verifyToken } from '@/lib/auth/token'
import { normalizeRole, OTP_CONFIG, VerificationErrorCode, VerificationErrorMessages } from '@/lib/auth/verification-service'

// ──────────────────────────────────────────────────────────────────────────
// generateSecureOtp
// ──────────────────────────────────────────────────────────────────────────

describe('generateSecureOtp', () => {
  it('generates a 6-digit numeric string by default', () => {
    const otp = generateSecureOtp()
    expect(otp).toMatch(/^\d{6}$/)
    expect(parseInt(otp, 10)).toBeGreaterThanOrEqual(100000)
    expect(parseInt(otp, 10)).toBeLessThan(1000000)
  })

  it('generates different codes on subsequent calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSecureOtp()))
    // With 6-digit codes and 20 samples, collisions are astronomically unlikely
    expect(codes.size).toBeGreaterThan(15)
  })

  it('supports custom length', () => {
    const otp4 = generateSecureOtp(4)
    expect(otp4).toMatch(/^\d{4}$/)
    expect(parseInt(otp4, 10)).toBeGreaterThanOrEqual(1000)
    expect(parseInt(otp4, 10)).toBeLessThan(10000)

    const otp8 = generateSecureOtp(8)
    expect(otp8).toMatch(/^\d{8}$/)
  })

  it('never generates codes shorter than expected length', () => {
    // Run 100 times to catch edge cases
    for (let i = 0; i < 100; i++) {
      const otp = generateSecureOtp()
      expect(otp.length).toBe(6)
    }
  })
})

// ──────────────────────────────────────────────────────────────────────────
// signToken / verifyToken (constant-time comparison)
// ──────────────────────────────────────────────────────────────────────────

describe('signToken and verifyToken', () => {
  beforeAll(() => {
    process.env.TOKEN_PEPPER = 'test-pepper-for-unit-tests'
  })

  afterAll(() => {
    delete process.env.TOKEN_PEPPER
  })

  it('signToken returns a hex string', () => {
    const hash = signToken('123456')
    expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 = 64 hex chars
  })

  it('verifyToken returns true for matching token', () => {
    const otp = '654321'
    const hash = signToken(otp)
    expect(verifyToken(otp, hash)).toBe(true)
  })

  it('verifyToken returns false for wrong token', () => {
    const hash = signToken('123456')
    expect(verifyToken('654321', hash)).toBe(false)
  })

  it('verifyToken returns false when no peppers are configured', () => {
    const hash = signToken('123456')
    const originalPepper = process.env.TOKEN_PEPPER
    delete process.env.TOKEN_PEPPER
    delete process.env.TOKEN_PEPPERS

    expect(verifyToken('123456', hash)).toBe(false)

    process.env.TOKEN_PEPPER = originalPepper!
  })

  it('verifyToken supports pepper rotation via TOKEN_PEPPERS', () => {
    const otp = '999999'
    // Sign with current pepper
    const hash = signToken(otp)

    // Now simulate pepper rotation: old pepper is second
    const original = process.env.TOKEN_PEPPER!
    process.env.TOKEN_PEPPERS = `new-pepper,${original}`
    delete process.env.TOKEN_PEPPER

    // Old hash should still verify (using the second pepper)
    expect(verifyToken(otp, hash)).toBe(true)

    // Clean up
    delete process.env.TOKEN_PEPPERS
    process.env.TOKEN_PEPPER = original
  })

  it('same token produces same hash (deterministic)', () => {
    const h1 = signToken('111111')
    const h2 = signToken('111111')
    expect(h1).toBe(h2)
  })

  it('different tokens produce different hashes', () => {
    const h1 = signToken('111111')
    const h2 = signToken('222222')
    expect(h1).not.toBe(h2)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// normalizeRole
// ──────────────────────────────────────────────────────────────────────────

describe('normalizeRole', () => {
  it('normalizes known roles correctly', () => {
    expect(normalizeRole('agent')).toBe('AGENT')
    expect(normalizeRole('AGENT')).toBe('AGENT')
    expect(normalizeRole('developer')).toBe('DEVELOPER')
    expect(normalizeRole('DEVELOPER')).toBe('DEVELOPER')
    expect(normalizeRole('agency')).toBe('AGENCY')
    expect(normalizeRole('AGENCY')).toBe('AGENCY')
    expect(normalizeRole('admin')).toBe('ADMIN')
    expect(normalizeRole('superadmin')).toBe('SUPERADMIN')
    expect(normalizeRole('verifier')).toBe('VERIFIER')
    expect(normalizeRole('moderator')).toBe('MODERATOR')
  })

  it('defaults to USER for unknown roles', () => {
    expect(normalizeRole('unknown')).toBe('USER')
    expect(normalizeRole('')).toBe('USER')
    expect(normalizeRole(null)).toBe('USER')
    expect(normalizeRole(undefined)).toBe('USER')
    expect(normalizeRole(123)).toBe('USER')
  })

  it('trims whitespace', () => {
    expect(normalizeRole('  agent  ')).toBe('AGENT')
    expect(normalizeRole(' DEVELOPER ')).toBe('DEVELOPER')
  })

  // Critical regression test: AGENCY was previously missing
  it('includes AGENCY in valid roles (regression)', () => {
    expect(normalizeRole('agency')).toBe('AGENCY')
    expect(normalizeRole('Agency')).toBe('AGENCY')
  })
})

// ──────────────────────────────────────────────────────────────────────────
// OTP_CONFIG
// ──────────────────────────────────────────────────────────────────────────

describe('OTP_CONFIG', () => {
  it('has expected defaults', () => {
    expect(OTP_CONFIG.length).toBe(6)
    expect(OTP_CONFIG.expiryMs).toBe(600000) // 10 minutes
    expect(OTP_CONFIG.maxAttempts).toBe(5)
    expect(OTP_CONFIG.lockoutSeconds).toBe(900) // 15 minutes
    expect(OTP_CONFIG.resendCooldownSeconds).toBe(30)
    expect(OTP_CONFIG.maxResendsPerHour).toBe(5)
    expect(OTP_CONFIG.maxResendsPerIpPerHour).toBe(50)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// VerificationErrorMessages
// ──────────────────────────────────────────────────────────────────────────

describe('VerificationErrorMessages', () => {
  it('has a message for every error code', () => {
    for (const code of Object.values(VerificationErrorCode)) {
      expect(VerificationErrorMessages[code]).toBeDefined()
      expect(typeof VerificationErrorMessages[code]).toBe('string')
      expect(VerificationErrorMessages[code].length).toBeGreaterThan(0)
    }
  })

  it('messages are user-friendly (not generic)', () => {
    // The original bug showed "Invalid verification code" — too generic
    expect(VerificationErrorMessages.OTP_INVALID).toContain('incorrect')
    expect(VerificationErrorMessages.OTP_EXPIRED).toContain('expired')
    expect(VerificationErrorMessages.OTP_MAX_ATTEMPTS).toContain('attempts')
    expect(VerificationErrorMessages.ACCOUNT_LOCKED).toContain('locked')
  })
})
