import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { OtpVerifyResult } from './types'

/** Generates a cryptographically secure 6-digit OTP */
export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

/** Creates a new OTP for a session, invalidating any previous OTPs */
export async function createOtp(sessionId: string): Promise<string> {
  // Invalidate existing active OTPs for this session
  await (prisma as any).whatsAppOtp.updateMany({
    where: { sessionId, used: false },
    data: { used: true },
  })

  const otp = generateOtp()
  const hashedOtp = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await (prisma as any).whatsAppOtp.create({
    data: { sessionId, hashedOtp, expiresAt },
  })

  return otp
}

/** Verifies an OTP for a session */
export async function verifyOtp(
  sessionId: string,
  inputOtp: string
): Promise<OtpVerifyResult> {
  const otpRecord = await (prisma as any).whatsAppOtp.findFirst({
    where: { sessionId, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (!otpRecord) return { valid: false, error: 'OTP_NOT_FOUND' }

  if (otpRecord.attempts >= 5) {
    return { valid: false, error: 'MAX_ATTEMPTS_REACHED' }
  }

  // Increment attempts before checking
  await (prisma as any).whatsAppOtp.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  })

  const isValid = await bcrypt.compare(inputOtp, otpRecord.hashedOtp)
  if (!isValid) return { valid: false, error: 'INVALID_OTP' }

  // Mark as used (one-time use)
  await (prisma as any).whatsAppOtp.update({
    where: { id: otpRecord.id },
    data: { used: true },
  })

  return { valid: true }
}
