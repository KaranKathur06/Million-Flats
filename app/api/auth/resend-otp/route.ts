import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import OTPEmail from '@/lib/email/templates/otpEmail'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function hashOtp(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function normalizeRole(input: unknown) {
  const role = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (['SUPERADMIN', 'ADMIN', 'VERIFIER', 'MODERATOR', 'AGENT', 'DEVELOPER'].includes(role)) return role
  return 'USER'
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = safeString(body?.email).toLowerCase()
    const requestedType = safeString(body?.type)
    const requestedRole = normalizeRole(requestedType)

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } }).catch(() => null)
    if (!user) {
      return NextResponse.json(
        { success: true, message: 'If an account exists, a verification code will be sent.' },
        { status: 200 }
      )
    }

    const alreadyVerified = Boolean(user.verified) || Boolean(user.emailVerified)
    if (alreadyVerified) {
      return NextResponse.json({ success: true, message: 'Email already verified.' }, { status: 200 })
    }

    const role = normalizeRole(user.role || requestedRole)
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    const codeHash = hashOtp(otp)

    await (prisma as any).loginOtp
      .updateMany({ where: { email: user.email, role, consumed: false, usedAt: null }, data: { consumed: true } })
      .catch(() => null)

    await (prisma as any).loginOtp
      .create({
        data: {
          id: crypto.randomUUID(),
          email: user.email,
          role,
          codeHash,
          attempts: 0,
          expiresAt,
          consumed: false,
          ipAddress: null,
        },
      })
      .catch(() => null)

    await sendEmail({
      to: user.email,
      subject: 'Your MillionFlats verification code',
      react: OTPEmail({ otp }),
    }).catch(() => null)

    return NextResponse.json({ success: true, message: 'Verification code sent to your email.' }, { status: 200 })
  } catch (error) {
    console.error('[resend-otp] error', error)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
