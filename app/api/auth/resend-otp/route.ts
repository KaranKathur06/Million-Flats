import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { signToken } from '@/lib/auth/token'
import { prisma } from '@/lib/prisma'
import { deliverOtp, parseOtpDeliveryChannel } from '@/lib/auth/otpDelivery'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
    const deliveryChannel = parseOtpDeliveryChannel(body?.deliveryChannel)

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 })
    }

    if (!deliveryChannel) {
      return NextResponse.json({ success: false, message: 'Invalid verification delivery method.' }, { status: 400 })
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
    const codeHash = signToken(otp)

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

    try {
      await deliverOtp({
        channel: deliveryChannel,
        email: user.email,
        phone: user.phone,
        userName: user.name,
        otp,
      })
    } catch (error) {
      await (prisma as any).loginOtp
        .updateMany({ where: { email: user.email, role, consumed: false, usedAt: null }, data: { consumed: true } })
        .catch(() => null)
      const message = error instanceof Error ? error.message : 'Verification code could not be sent.'
      return NextResponse.json({ success: false, message }, { status: 503 })
    }

    // In non-production or when DEBUG_RESEND_OTP=1, include the numeric OTP in the JSON response
    const includeOtp = process.env.NODE_ENV !== 'production' || process.env.DEBUG_RESEND_OTP === '1'
    const responseBody: any = {
      success: true,
      message: `Verification code sent to your ${deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'email'}.`,
    }
    if (includeOtp && deliveryChannel === 'email') responseBody.otp = otp

    return NextResponse.json(responseBody, { status: 200 })
  } catch (error) {
    console.error('[resend-otp] error', error)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
