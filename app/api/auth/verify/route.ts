import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function hashOtp(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function normalizeRole(input: unknown) {
  const role = typeof input === 'string' ? input.trim().toUpperCase() : ''
  return role === 'AGENT' ? 'AGENT' : 'USER'
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
    const otpRow = await (prisma as any).loginOtp
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

    if (!otpRow) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code.' },
        { status: 400 }
      )
    }

    const codeHash = hashOtp(otp)
    if (codeHash !== String(otpRow.codeHash)) {
      const attempts = Number(otpRow.attempts || 0) + 1
      await (prisma as any).loginOtp
        .update({
          where: { id: otpRow.id },
          data: { attempts, consumed: attempts >= 5 } as any,
        })
        .catch(() => null)

      return NextResponse.json(
        { success: false, message: 'Invalid verification code.' },
        { status: 400 }
      )
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
