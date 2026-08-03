/**
 * whatsapp-otp-service.ts
 *
 * Central orchestration service for WhatsApp OTP authentication.
 * Handles OTP generation, secure storage, dispatch via AiSensy, verification,
 * user creation/lookup, and session token issuance.
 *
 * Security:
 *   - OTPs are bcrypt-hashed before storage (never plaintext)
 *   - Phone numbers are AES-256-GCM encrypted + SHA-256 hashed
 *   - Rate limiting at phone, IP, and device levels
 *   - Single active OTP per phone (previous ones expired on new send)
 *   - Replay attack prevention via status transitions
 *   - Comprehensive audit logging
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { hashPhone, encryptPhone, decryptPhone, normalizePhone, isValidE164, maskPhone } from '@/lib/auth/phone-crypto'
import { checkOtpSendRateLimit, checkOtpVerifyRateLimit } from '@/lib/auth/otp-rate-limiter'
import { sendOtpViaAiSensy } from '@/lib/auth/strategies/aisensy-provider'
import { isWhatsappEnabled } from '@/lib/auth/auth-settings-service'

// ─── Configuration ───────────────────────────────────────────────────────────

const OTP_CONFIG = {
  /** Number of digits */
  length: 6,
  /** Validity in milliseconds (5 minutes) */
  expiryMs: 5 * 60 * 1000,
  /** Max verification attempts per OTP */
  maxAttempts: 5,
  /** Bcrypt salt rounds for OTP hashing */
  bcryptRounds: 10,
  /** Verification token validity (2 minutes) — short-lived bridge to NextAuth */
  verificationTokenExpirySeconds: 120,
} as const

// ─── Result Types ────────────────────────────────────────────────────────────

export interface OtpSendResult {
  success: boolean
  maskedPhone?: string
  expiresIn?: number      // seconds
  resendAfter?: number    // seconds
  error?: string
  errorCode?: string
}

export interface OtpVerifyResult {
  success: boolean
  verificationToken?: string  // short-lived JWT to bridge to NextAuth signIn
  isNewUser?: boolean
  error?: string
  errorCode?: string
  remainingAttempts?: number
}

// ─── Generate Secure OTP ─────────────────────────────────────────────────────

function generateSecureOtp(length: number = OTP_CONFIG.length): string {
  const bytes = crypto.randomBytes(length)
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += (bytes[i] % 10).toString()
  }
  return otp
}

// ─── Send OTP ────────────────────────────────────────────────────────────────

/**
 * Generates a new OTP, stores it securely, and dispatches via AiSensy WhatsApp.
 *
 * Flow:
 * 1. Validate phone format
 * 2. Check if WhatsApp auth is enabled (AuthSettings)
 * 3. Check rate limits
 * 4. Expire any existing pending OTPs for this phone
 * 5. Generate cryptographically secure 6-digit OTP
 * 6. Hash OTP with bcrypt, encrypt phone with AES-256-GCM
 * 7. Store in WhatsappOtpRequest
 * 8. Dispatch via AiSensy
 * 9. Log the attempt
 */
export async function sendWhatsappOtp(input: {
  phone: string
  ipAddress: string
  userAgent: string
  deviceId?: string
}): Promise<OtpSendResult> {
  const { ipAddress, userAgent, deviceId } = input

  // 1. Validate phone format
  const phone = normalizePhone(input.phone)
  if (!isValidE164(phone)) {
    return { success: false, error: 'Invalid phone number format.', errorCode: 'INVALID_PHONE' }
  }

  // 2. Check if WhatsApp auth is enabled
  const whatsappEnabled = await isWhatsappEnabled()
  if (!whatsappEnabled) {
    return { success: false, error: 'WhatsApp authentication is currently disabled.', errorCode: 'WHATSAPP_DISABLED' }
  }

  // 3. Check rate limits
  const phoneH = hashPhone(phone)
  const rateLimit = await checkOtpSendRateLimit(phoneH, ipAddress)
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: rateLimit.reason || 'Rate limit exceeded.',
      errorCode: 'RATE_LIMITED',
      resendAfter: rateLimit.retryAfterSeconds,
    }
  }

  // 4. Check if user is blocked
  try {
    const existingUser = await prisma.user.findFirst({
      where: { phoneHash: phoneH },
      select: { id: true, status: true },
    })
    if (existingUser) {
      const status = String((existingUser as any).status || 'ACTIVE').toUpperCase()
      if (status === 'BANNED') {
        return { success: false, error: 'This phone number has been blocked.', errorCode: 'PHONE_BLOCKED' }
      }
    }
  } catch {
    // Non-critical: if we can't check blocked status, continue
  }

  // 5. Expire existing pending OTPs for this phone
  try {
    await (prisma as any).whatsappOtpRequest.updateMany({
      where: { phoneHash: phoneH, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })
  } catch {
    // Non-critical
  }

  // 6. Generate OTP and hash it
  const otp = generateSecureOtp()
  const otpHash = await bcrypt.hash(otp, OTP_CONFIG.bcryptRounds)
  const phoneEncrypted = encryptPhone(phone)
  const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMs)

  // 7. Store in database
  let otpRecord: any
  try {
    otpRecord = await (prisma as any).whatsappOtpRequest.create({
      data: {
        phoneHash: phoneH,
        phoneEncrypted,
        otpHash,
        status: 'PENDING',
        expiresAt,
        maxAttempts: OTP_CONFIG.maxAttempts,
        ipAddress,
        userAgent: userAgent.slice(0, 500),
        deviceId: deviceId || null,
        provider: 'AISENSY',
      },
    })
  } catch (error) {
    console.error('[whatsapp-otp] Failed to store OTP:', error)
    return { success: false, error: 'Failed to create verification request.', errorCode: 'DB_ERROR' }
  }

  // 8. Dispatch via AiSensy
  const sendResult = await sendOtpViaAiSensy(phone, otp)

  if (!sendResult.success) {
    // Mark as failed
    await (prisma as any).whatsappOtpRequest.update({
      where: { id: otpRecord.id },
      data: { status: 'EXPIRED' },
    }).catch(() => null)

    console.error('[whatsapp-otp] AiSensy dispatch failed:', sendResult.error)
    return {
      success: false,
      error: 'Failed to send verification code. Please try again.',
      errorCode: 'SEND_FAILED',
    }
  }

  // 9. Update record with send details
  await (prisma as any).whatsappOtpRequest.update({
    where: { id: otpRecord.id },
    data: {
      sentAt: new Date(),
      messageId: sendResult.messageId || null,
    },
  }).catch(() => null)

  // 10. Log the attempt
  await logLoginAudit({
    phoneHash: phoneH,
    provider: 'WHATSAPP',
    success: true,
    ipAddress,
    userAgent,
    deviceId,
  }).catch(() => null)

  const masked = maskPhone(phone)
  return {
    success: true,
    maskedPhone: masked,
    expiresIn: Math.floor(OTP_CONFIG.expiryMs / 1000),
    resendAfter: 60,
  }
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

/**
 * Verifies an OTP and returns a short-lived verification token.
 *
 * Flow:
 * 1. Validate inputs
 * 2. Check rate limits
 * 3. Find the latest PENDING OTP for this phone
 * 4. Check expiry and attempts
 * 5. Compare OTP via bcrypt (timing-safe)
 * 6. Mark OTP as VERIFIED (one-time use)
 * 7. Find or create user
 * 8. Issue a short-lived verification token
 * 9. Log the result
 */
export async function verifyWhatsappOtp(input: {
  phone: string
  otp: string
  ipAddress: string
  userAgent: string
  deviceId?: string
}): Promise<OtpVerifyResult> {
  const { otp, ipAddress, userAgent, deviceId } = input
  const phone = normalizePhone(input.phone)

  // 1. Validate
  if (!isValidE164(phone)) {
    return { success: false, error: 'Invalid phone number.', errorCode: 'INVALID_PHONE' }
  }
  if (!/^\d{6}$/.test(otp)) {
    return { success: false, error: 'Code must be 6 digits.', errorCode: 'INVALID_OTP_FORMAT' }
  }

  // 2. Rate limit
  const rateCheck = await checkOtpVerifyRateLimit(ipAddress)
  if (!rateCheck.allowed) {
    return { success: false, error: rateCheck.reason, errorCode: 'RATE_LIMITED' }
  }

  const phoneH = hashPhone(phone)

  // 3. Find latest pending OTP
  let otpRecord: any
  try {
    otpRecord = await (prisma as any).whatsappOtpRequest.findFirst({
      where: {
        phoneHash: phoneH,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('[whatsapp-otp] DB error fetching OTP:', error)
    return { success: false, error: 'Verification service unavailable.', errorCode: 'DB_ERROR' }
  }

  if (!otpRecord) {
    return { success: false, error: 'No pending verification found. Please request a new code.', errorCode: 'NO_PENDING_OTP' }
  }

  // 4. Check attempts
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await (prisma as any).whatsappOtpRequest.update({
      where: { id: otpRecord.id },
      data: { status: 'BLOCKED' },
    }).catch(() => null)

    await logLoginAudit({
      phoneHash: phoneH,
      provider: 'WHATSAPP',
      success: false,
      failReason: 'MAX_ATTEMPTS_EXCEEDED',
      ipAddress,
      userAgent,
      deviceId,
    }).catch(() => null)

    return { success: false, error: 'Too many failed attempts. Please request a new code.', errorCode: 'MAX_ATTEMPTS', remainingAttempts: 0 }
  }

  // 5. Increment attempts BEFORE comparison (prevents timing attacks on attempt count)
  await (prisma as any).whatsappOtpRequest.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  }).catch(() => null)

  // 6. Compare OTP (bcrypt — timing-safe)
  const isValid = await bcrypt.compare(otp, otpRecord.otpHash)

  if (!isValid) {
    const remaining = otpRecord.maxAttempts - (otpRecord.attempts + 1)

    await logLoginAudit({
      phoneHash: phoneH,
      provider: 'WHATSAPP',
      success: false,
      failReason: 'INVALID_OTP',
      ipAddress,
      userAgent,
      deviceId,
    }).catch(() => null)

    return {
      success: false,
      error: `Incorrect code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : 'Please request a new code.'}`,
      errorCode: 'INVALID_OTP',
      remainingAttempts: Math.max(0, remaining),
    }
  }

  // 7. Mark as VERIFIED (one-time use — prevents replay)
  await (prisma as any).whatsappOtpRequest.update({
    where: { id: otpRecord.id },
    data: { status: 'VERIFIED', verifiedAt: new Date() },
  }).catch(() => null)

  // 8. Find or create user
  let user: any
  let isNewUser = false
  try {
    user = await prisma.user.findFirst({ where: { phoneHash: phoneH } })

    if (!user) {
      isNewUser = true
      const phoneEnc = encryptPhone(phone)
      user = await prisma.user.create({
        data: {
          email: `wa_${phoneH.slice(0, 12)}@placeholder.millionflats.com`,
          phoneHash: phoneH,
          phoneEncrypted: phoneEnc,
          phone: phone, // Legacy field — will be migrated
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          primaryAuthProvider: 'WHATSAPP',
          whatsappOptIn: true,
          verified: true,
          role: 'USER',
          status: 'ACTIVE',
          authProvider: 'whatsapp',
        } as any,
      })
    } else {
      // Update existing user's phone verification status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          lastLogin: new Date(),
          lastIp: ipAddress,
          lastDevice: userAgent.slice(0, 200),
        } as any,
      }).catch(() => null)
    }
  } catch (error) {
    console.error('[whatsapp-otp] User creation/lookup error:', error)
    return { success: false, error: 'Account setup failed. Please try again.', errorCode: 'USER_ERROR' }
  }

  // 9. Check user status
  const userStatus = String((user as any).status || 'ACTIVE').toUpperCase()
  if (userStatus === 'BANNED') {
    return { success: false, error: 'This account has been suspended.', errorCode: 'ACCOUNT_BANNED' }
  }
  if (userStatus === 'SUSPENDED') {
    return { success: false, error: 'This account has been temporarily disabled.', errorCode: 'ACCOUNT_SUSPENDED' }
  }

  // 10. Issue short-lived verification token (bridge to NextAuth signIn)
  const secret = process.env.OTP_VERIFICATION_SECRET || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error('[whatsapp-otp] Missing OTP_VERIFICATION_SECRET')
    return { success: false, error: 'Server configuration error.', errorCode: 'CONFIG_ERROR' }
  }

  const verificationToken = jwt.sign(
    {
      sub: user.id,
      phone: phoneH, // Only hash, never raw phone
      purpose: 'whatsapp-otp-verified',
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    { expiresIn: `${OTP_CONFIG.verificationTokenExpirySeconds}s` },
  )

  // 11. Audit log
  await logLoginAudit({
    userId: user.id,
    phoneHash: phoneH,
    provider: 'WHATSAPP',
    success: true,
    ipAddress,
    userAgent,
    deviceId,
  }).catch(() => null)

  return {
    success: true,
    verificationToken,
    isNewUser,
  }
}

// ─── Audit Logging ───────────────────────────────────────────────────────────

async function logLoginAudit(data: {
  userId?: string
  phoneHash?: string
  email?: string
  provider: 'WHATSAPP' | 'EMAIL' | 'GOOGLE' | 'APPLE'
  success: boolean
  failReason?: string
  ipAddress?: string
  userAgent?: string
  deviceId?: string
}) {
  try {
    await (prisma as any).loginAudit.create({
      data: {
        userId: data.userId || null,
        phoneHash: data.phoneHash || null,
        email: data.email || null,
        provider: data.provider,
        success: data.success,
        failReason: data.failReason || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent?.slice(0, 500) || null,
        deviceId: data.deviceId || null,
      },
    })
  } catch (error) {
    console.error('[login-audit] Failed to write audit log:', error)
  }
}

export { logLoginAudit }
