/**
 * verification-service.ts
 *
 * Centralized email verification service shared by ALL portals.
 * Handles OTP generation, storage, validation, rate limiting, and user verification status.
 *
 * Usage:
 *   import { VerificationService } from '@/lib/auth/verification-service'
 *   await VerificationService.generateAndStoreOtp(email, 'AGENT')
 *   await VerificationService.verifyOtp(email, '123456', 'AGENT')
 *   await VerificationService.resendOtp(email, 'DEVELOPER', clientIp)
 */

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { signToken, verifyToken, generateSecureOtp } from '@/lib/auth/token'
import { sendEmail } from '@/lib/email/sendEmail'
import OTPEmail from '@/lib/email/templates/otpEmail'
import { getRedis, setWithExpiry, getValue, incrWithExpiry } from '@/lib/redis'

// ──────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────

export const OTP_CONFIG = {
  /** Number of digits in OTP */
  length: 6,
  /** OTP validity in milliseconds (10 minutes) */
  expiryMs: 10 * 60 * 1000,
  /** Maximum verification attempts per OTP before it's consumed */
  maxAttempts: 5,
  /** Lockout duration in seconds after max attempts (15 minutes) */
  lockoutSeconds: 15 * 60,
  /** Cooldown between resends in seconds */
  resendCooldownSeconds: 30,
  /** Maximum resends per email per hour */
  maxResendsPerHour: 5,
  /** Maximum resends per IP per hour */
  maxResendsPerIpPerHour: 50,
} as const

// ──────────────────────────────────────────────────────────────────────────
// ERROR CODES — Structured errors for frontend consumption
// ──────────────────────────────────────────────────────────────────────────

export const VerificationErrorCode = {
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_ALREADY_USED: 'OTP_ALREADY_USED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  RATE_LIMITED: 'RATE_LIMITED',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type VerificationErrorCodeType = typeof VerificationErrorCode[keyof typeof VerificationErrorCode]

/** Human-readable error messages mapped to error codes */
export const VerificationErrorMessages: Record<VerificationErrorCodeType, string> = {
  [VerificationErrorCode.OTP_INVALID]: 'The verification code is incorrect. Please check and try again.',
  [VerificationErrorCode.OTP_EXPIRED]: 'This code has expired. Please request a new one.',
  [VerificationErrorCode.OTP_MAX_ATTEMPTS]: 'Too many failed attempts. Please request a new verification code.',
  [VerificationErrorCode.OTP_ALREADY_USED]: 'This code has already been used. Please request a new one.',
  [VerificationErrorCode.ACCOUNT_LOCKED]: 'Account temporarily locked due to repeated failed attempts. Please try again in 15 minutes.',
  [VerificationErrorCode.ALREADY_VERIFIED]: 'Your email is already verified. You can sign in.',
  [VerificationErrorCode.USER_NOT_FOUND]: 'If an account exists with this email, a verification code will be sent.',
  [VerificationErrorCode.MISSING_FIELDS]: 'Email and verification code are required.',
  [VerificationErrorCode.INVALID_FORMAT]: 'Verification code must be a 6-digit number.',
  [VerificationErrorCode.RATE_LIMITED]: 'Too many verification requests. Please try again later.',
  [VerificationErrorCode.COOLDOWN_ACTIVE]: 'A code was recently sent. Please wait before requesting another.',
  [VerificationErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
}

// ──────────────────────────────────────────────────────────────────────────
// ROLE NORMALIZATION
// ──────────────────────────────────────────────────────────────────────────

const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'DEVELOPER', 'AGENCY'] as const

/**
 * Normalize a role string to uppercase. Falls back to 'USER' for unknown roles.
 * Includes AGENCY — previously missing from some endpoints.
 */
export function normalizeRole(input: unknown): string {
  const role = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if ((VALID_ROLES as readonly string[]).includes(role)) return role
  return 'USER'
}

// ──────────────────────────────────────────────────────────────────────────
// SERVICE
// ──────────────────────────────────────────────────────────────────────────

export interface VerificationResult {
  success: boolean
  code?: VerificationErrorCodeType
  message: string
}

export interface GenerateOtpResult {
  success: boolean
  otp?: string
  message: string
  code?: VerificationErrorCodeType
}

export interface ResendOtpResult {
  success: boolean
  message: string
  code?: VerificationErrorCodeType
  cooldownRemaining?: number
  /** Included only in non-production for debugging */
  otp?: string
}

export const VerificationService = {
  /**
   * Generate a new OTP for a given email and role.
   * Invalidates all previous active OTPs for the same email+role.
   * Returns the plaintext OTP (to be sent via email).
   */
  async generateAndStoreOtp(
    email: string,
    role: string,
    ipAddress?: string | null
  ): Promise<GenerateOtpResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedRole = normalizeRole(role)

      // Invalidate all previous OTPs for this email+role
      await (prisma as any).loginOtp
        .updateMany({
          where: {
            email: normalizedEmail,
            role: normalizedRole,
            consumed: false,
            usedAt: null,
          },
          data: { consumed: true },
        })
        .catch(() => null)

      // Generate new OTP
      const otp = generateSecureOtp(OTP_CONFIG.length)
      const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMs)
      const codeHash = signToken(otp)

      await (prisma as any).loginOtp.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          role: normalizedRole,
          codeHash,
          attempts: 0,
          expiresAt,
          consumed: false,
          ipAddress: ipAddress || null,
        },
      })

      return { success: true, otp, message: 'OTP generated successfully' }
    } catch (error) {
      console.error('[VerificationService.generateAndStoreOtp] error', error)
      return {
        success: false,
        message: VerificationErrorMessages[VerificationErrorCode.INTERNAL_ERROR],
        code: VerificationErrorCode.INTERNAL_ERROR,
      }
    }
  },

  /**
   * Verify an OTP code for a given email.
   * On success: marks OTP consumed, marks user email as verified.
   * On failure: increments attempt counter, locks after max attempts.
   */
  async verifyOtp(
    email: string,
    otp: string,
    role: string
  ): Promise<VerificationResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const expectedRole = normalizeRole(role)

      // Validation
      if (!normalizedEmail || !otp) {
        return {
          success: false,
          code: VerificationErrorCode.MISSING_FIELDS,
          message: VerificationErrorMessages[VerificationErrorCode.MISSING_FIELDS],
        }
      }

      if (!/^[0-9]{6}$/.test(otp)) {
        return {
          success: false,
          code: VerificationErrorCode.INVALID_FORMAT,
          message: VerificationErrorMessages[VerificationErrorCode.INVALID_FORMAT],
        }
      }

      const now = new Date()

      // Check for lockout
      const redis = getRedis()
      const lockKey = `lock:verify:email:${normalizedEmail}`
      if (redis) {
        const locked = await redis.get(lockKey).catch(() => null)
        if (locked) {
          return {
            success: false,
            code: VerificationErrorCode.ACCOUNT_LOCKED,
            message: VerificationErrorMessages[VerificationErrorCode.ACCOUNT_LOCKED],
          }
        }
      }

      // Find active OTP — first try role-specific, then role-agnostic fallback
      let otpRow = await (prisma as any).loginOtp
        .findFirst({
          where: {
            email: normalizedEmail,
            role: expectedRole,
            consumed: false,
            usedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        })
        .catch(() => null)

      // Fallback: role-agnostic lookup
      if (!otpRow) {
        otpRow = await (prisma as any).loginOtp
          .findFirst({
            where: {
              email: normalizedEmail,
              consumed: false,
              usedAt: null,
              expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
          })
          .catch(() => null)
      }

      if (!otpRow) {
        // Check if there's an expired OTP to give better error
        const expiredOtp = await (prisma as any).loginOtp
          .findFirst({
            where: {
              email: normalizedEmail,
              consumed: false,
              usedAt: null,
              expiresAt: { lte: now },
            },
            orderBy: { createdAt: 'desc' },
          })
          .catch(() => null)

        if (expiredOtp) {
          return {
            success: false,
            code: VerificationErrorCode.OTP_EXPIRED,
            message: VerificationErrorMessages[VerificationErrorCode.OTP_EXPIRED],
          }
        }

        return {
          success: false,
          code: VerificationErrorCode.OTP_INVALID,
          message: VerificationErrorMessages[VerificationErrorCode.OTP_INVALID],
        }
      }

      // Verify the OTP hash (constant-time comparison)
      const isValid = verifyToken(otp, String(otpRow.codeHash))
      if (!isValid) {
        const attempts = Number(otpRow.attempts || 0) + 1
        const consumed = attempts >= OTP_CONFIG.maxAttempts

        await (prisma as any).loginOtp
          .update({
            where: { id: otpRow.id },
            data: { attempts, consumed } as any,
          })
          .catch(() => null)

        // Lock account after max attempts
        if (consumed && redis) {
          const lockSeconds = Number(process.env.VERIFY_LOCK_SECONDS || OTP_CONFIG.lockoutSeconds)
          await setWithExpiry(lockKey, '1', lockSeconds)
        }

        if (consumed) {
          return {
            success: false,
            code: VerificationErrorCode.OTP_MAX_ATTEMPTS,
            message: VerificationErrorMessages[VerificationErrorCode.OTP_MAX_ATTEMPTS],
          }
        }

        return {
          success: false,
          code: VerificationErrorCode.OTP_INVALID,
          message: VerificationErrorMessages[VerificationErrorCode.OTP_INVALID],
        }
      }

      // OTP is valid — mark consumed
      await (prisma as any).loginOtp
        .update({
          where: { id: otpRow.id },
          data: { consumed: true, usedAt: now } as any,
        })
        .catch(() => null)

      // Find and verify the user
      const user = await prisma.user
        .findUnique({ where: { email: normalizedEmail } })
        .catch(() => null)

      if (!user) {
        return {
          success: false,
          code: VerificationErrorCode.USER_NOT_FOUND,
          message: 'No account found for that email address.',
        }
      }

      // Mark email as verified on User
      if (!user.verified || !user.emailVerified) {
        await prisma.user
          .update({
            where: { id: user.id },
            data: {
              verified: true,
              emailVerified: true,
              emailVerifiedAt: now,
            } as any,
          })
          .catch((err) => {
            console.error('[VerificationService.verifyOtp] failed to update User', err)
          })
      }

      // Update role-specific profile status based on the role used for OTP
      const actualRole = otpRow.role || expectedRole
      try {
        if (actualRole === 'DEVELOPER') {
          // Update DeveloperProfile onboarding status
          await (prisma as any).developerProfile
            .updateMany({
              where: { userId: user.id },
              data: {
                onboardingStatus: 'EMAIL_VERIFIED',
              },
            })
            .catch(() => null)
        } else if (actualRole === 'AGENCY') {
          // Update AgencyProfile status (if exists)
          await (prisma as any).agencyProfile
            .updateMany({
              where: { userId: user.id },
              data: {
                onboardingStatus: 'EMAIL_VERIFIED',
              },
            })
            .catch(() => null)
        } else if (actualRole === 'AGENT') {
          // Update Agent status
          await (prisma as any).agent
            .updateMany({
              where: { userId: user.id },
              data: {
                status: 'EMAIL_VERIFIED',
              },
            })
            .catch(() => null)
        }
      } catch (profileErr) {
        console.error('[VerificationService.verifyOtp] failed to update profile status', profileErr)
        // Don't fail verification if profile update fails — user is still verified
      }

      return {
        success: true,
        message: 'Email verified successfully.',
      }
    } catch (error) {
      console.error('[VerificationService.verifyOtp] error', error)
      return {
        success: false,
        code: VerificationErrorCode.INTERNAL_ERROR,
        message: VerificationErrorMessages[VerificationErrorCode.INTERNAL_ERROR],
      }
    }
  },

  /**
   * Resend OTP for a given email + role.
   * Enforces rate limiting (30s cooldown, 5/hour per email, 50/hour per IP).
   */
  async resendOtp(
    email: string,
    role: string,
    clientIp?: string | null
  ): Promise<ResendOtpResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedRole = normalizeRole(role)

      if (!normalizedEmail) {
        return {
          success: false,
          message: 'Email address is required.',
          code: VerificationErrorCode.MISSING_FIELDS,
        }
      }

      // Check if user exists (don't reveal)
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } }).catch(() => null)
      if (!user) {
        return {
          success: true,
          message: VerificationErrorMessages[VerificationErrorCode.USER_NOT_FOUND],
        }
      }

      // Already verified
      const alreadyVerified = Boolean(user.verified) || Boolean(user.emailVerified)
      if (alreadyVerified) {
        return {
          success: true,
          message: 'Email already verified. You can sign in.',
          code: VerificationErrorCode.ALREADY_VERIFIED,
        }
      }

      // Rate limiting
      const redis = getRedis()
      const ip = clientIp || 'unknown'
      const emailKey = `rl:resend:otp:email:${normalizedEmail}`
      const ipKey = `rl:resend:otp:ip:${ip}`
      const cooldownKey = `rl:resend:otp:cooldown:${normalizedEmail}`

      if (redis) {
        // Check cooldown
        const cooldown = await getValue(cooldownKey)
        if (cooldown) {
          return {
            success: true,
            message: VerificationErrorMessages[VerificationErrorCode.COOLDOWN_ACTIVE],
            code: VerificationErrorCode.COOLDOWN_ACTIVE,
          }
        }

        // Check email rate limit
        const emailCount = await incrWithExpiry(emailKey, 60 * 60)
        if (emailCount > OTP_CONFIG.maxResendsPerHour) {
          return {
            success: false,
            message: VerificationErrorMessages[VerificationErrorCode.RATE_LIMITED],
            code: VerificationErrorCode.RATE_LIMITED,
          }
        }

        // Check IP rate limit
        const ipCount = await incrWithExpiry(ipKey, 60 * 60)
        if (ipCount > OTP_CONFIG.maxResendsPerIpPerHour) {
          return {
            success: false,
            message: 'Too many requests from this IP. Please try later.',
            code: VerificationErrorCode.RATE_LIMITED,
          }
        }
      }

      // Generate and store OTP
      const result = await VerificationService.generateAndStoreOtp(
        normalizedEmail,
        normalizedRole,
        ip
      )

      if (!result.success || !result.otp) {
        return {
          success: false,
          message: result.message,
          code: VerificationErrorCode.INTERNAL_ERROR,
        }
      }

      // Send email
      await sendEmail({
        to: user.email,
        subject: 'Your MillionFlats verification code',
        react: OTPEmail({ otp: result.otp, userName: user.name || undefined }),
      }).catch(() => null)

      // Set cooldown
      if (redis) {
        await setWithExpiry(cooldownKey, '1', OTP_CONFIG.resendCooldownSeconds)
      }

      // Include OTP in response for non-production debugging
      const includeOtp = process.env.NODE_ENV !== 'production' || process.env.DEBUG_RESEND_OTP === '1'
      const response: ResendOtpResult = {
        success: true,
        message: 'Verification code sent to your email.',
      }
      if (includeOtp) response.otp = result.otp

      return response
    } catch (error) {
      console.error('[VerificationService.resendOtp] error', error)
      return {
        success: false,
        message: VerificationErrorMessages[VerificationErrorCode.INTERNAL_ERROR],
        code: VerificationErrorCode.INTERNAL_ERROR,
      }
    }
  },

  /**
   * Send OTP email during registration flow.
   * Lighter than resendOtp — no rate limiting (registration already has its own).
   */
  async sendRegistrationOtp(
    email: string,
    role: string,
    userName?: string | null,
    clientIp?: string | null
  ): Promise<GenerateOtpResult> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedRole = normalizeRole(role)

    const result = await VerificationService.generateAndStoreOtp(
      normalizedEmail,
      normalizedRole,
      clientIp
    )

    if (!result.success || !result.otp) return result

    await sendEmail({
      to: normalizedEmail,
      subject: 'Your MillionFlats verification code',
      react: OTPEmail({ otp: result.otp, userName: userName || undefined }),
    }).catch(() => null)

    return result
  },
}
