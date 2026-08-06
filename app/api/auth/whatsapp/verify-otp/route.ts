/**
 * POST /api/auth/whatsapp/verify-otp
 *
 * Verifies the 6-digit OTP and returns a short-lived verification token.
 * Frontend then passes this token to NextAuth signIn('whatsapp-otp').
 *
 * Body: { phone: string, otp: string }
 * Response: { success, verificationToken, isNewUser } | { success: false, error, errorCode, remainingAttempts }
 */

import { NextResponse } from 'next/server'
import { verifyWhatsappOtp } from '@/lib/auth/whatsapp-otp-service'
import { isWhatsappEnabled, isAuthDisabled } from '@/lib/auth/auth-settings-service'

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return '127.0.0.1'
}

export async function POST(request: Request) {
  try {
    // 1. Check auth mode — but allow in-flight verifications even if admin just disabled
    // (OTP was already sent, user should be able to complete verification until OTP expires)
    const disabled = await isAuthDisabled()
    if (disabled) {
      return NextResponse.json(
        { success: false, error: 'Authentication is temporarily unavailable.', errorCode: 'AUTH_DISABLED' },
        { status: 503 },
      )
    }

    // 2. Parse body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.', errorCode: 'INVALID_BODY' },
        { status: 400 },
      )
    }

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const otp = typeof body?.otp === 'string' ? body.otp.trim() : ''

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: 'Phone number and verification code are required.', errorCode: 'MISSING_FIELDS' },
        { status: 400 },
      )
    }

    // 3. Verify OTP
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || ''

    const result = await verifyWhatsappOtp({
      phone,
      otp,
      ipAddress,
      userAgent,
      deviceId: typeof body?.deviceId === 'string' ? body.deviceId : undefined,
    })

    if (!result.success) {
      const status = result.errorCode === 'RATE_LIMITED' ? 429
        : result.errorCode === 'ACCOUNT_BANNED' || result.errorCode === 'ACCOUNT_SUSPENDED' ? 403
        : 400
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          remainingAttempts: result.remainingAttempts,
        },
        { status },
      )
    }

    return NextResponse.json({
      success: true,
      verificationToken: result.verificationToken,
      isNewUser: result.isNewUser,
    })
  } catch (error) {
    console.error('[api/whatsapp/verify-otp] Unhandled error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
