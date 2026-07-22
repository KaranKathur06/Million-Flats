import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/token'
import { getRedis, setWithExpiry } from '@/lib/redis'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

// OTP verification uses HMAC-PEPPER via verifyToken

function normalizeRole(input: unknown) {
  const role = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (['SUPERADMIN', 'ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'DEVELOPER', 'AGENCY'].includes(role)) return role
  return 'USER'
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = safeString(body?.email).toLowerCase()
    const otp = safeString(body?.otp)
    const type = safeString(body?.type)
    const expectedRole = normalizeRole(type)

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required.' },
        { status: 400 }
      )
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: 'OTP must be a 6-digit code.' },
        { status: 400 }
      )
    }

    const now = new Date()
    let otpRow = await (prisma as any).loginOtp
      .findFirst({
        where: {
          email,
          role: expectedRole,
          consumed: false,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => null)

    // Fallback: role-agnostic lookup if no match found for the expected role.
    // This handles edge cases where the OTP was stored with a different role
    // (e.g. user.role in DB differs from the frontend's type param).
    if (!otpRow) {
      otpRow = await (prisma as any).loginOtp
        .findFirst({
          where: {
            email,
            consumed: false,
            usedAt: null,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: 'desc' },
        })
        .catch(() => null)
    }

    if (!otpRow) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code.' },
        { status: 400 }
      )
    }

    // check for temporary lock via Redis
    const redis = getRedis()
    const lockKey = `lock:verify:email:${email}`
    if (redis) {
      const locked = await redis.get(lockKey).catch(() => null)
      if (locked) {
        return NextResponse.json({ success: false, message: 'Account locked due to repeated failed attempts. Try again later.' }, { status: 429 })
      }
    }

    const isValid = verifyToken(otp, String(otpRow.codeHash))
    if (!isValid) {
      const attempts = Number(otpRow.attempts || 0) + 1
      const consumed = attempts >= 5
      await (prisma as any).loginOtp
        .update({ where: { id: otpRow.id }, data: { attempts, consumed } as any })
        .catch(() => null)

      if (consumed && redis) {
        // lock for 15 minutes
        await setWithExpiry(lockKey, '1', Number(process.env.VERIFY_LOCK_SECONDS || 15 * 60))
      }

      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 400 })
    }

    await (prisma as any).loginOtp
      .update({
        where: { id: otpRow.id },
        data: { consumed: true, usedAt: now } as any,
      })
      .catch(() => null)

    const user = await prisma.user
      .findUnique({ where: { email } })
      .catch(() => null)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No account found for that email address.' },
        { status: 404 }
      )
    }

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
        .catch(() => null)
    }

    return NextResponse.json({ success: true, message: 'Email verified successfully.' }, { status: 200 })
  } catch (error) {
    console.error('[verify] error', error)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
