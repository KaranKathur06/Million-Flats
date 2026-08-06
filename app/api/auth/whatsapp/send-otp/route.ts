/**
 * POST /api/auth/whatsapp/send-otp
 *
 * Sends a 6-digit OTP to the given phone number via WhatsApp (AiSensy).
 * Enforces rate limiting, auth mode checks, and phone validation.
 *
 * Body: { phone: string }
 * Response: { success, maskedPhone, expiresIn, resendAfter } | { success: false, error, errorCode }
 */

import { NextResponse } from 'next/server'
import { sendWhatsappOtp } from '@/lib/auth/whatsapp-otp-service'
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
    // 1. Check auth mode
    const disabled = await isAuthDisabled()
    if (disabled) {
      return NextResponse.json(
        { success: false, error: 'Authentication is temporarily unavailable.', errorCode: 'AUTH_DISABLED' },
        { status: 503 },
      )
    }

    const waEnabled = await isWhatsappEnabled()
    if (!waEnabled) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp authentication is currently disabled.', errorCode: 'WHATSAPP_DISABLED' },
        { status: 403 },
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
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.', errorCode: 'MISSING_PHONE' },
        { status: 400 },
      )
    }

    // 3. Send OTP
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || ''

    const result = await sendWhatsappOtp({
      phone,
      ipAddress,
      userAgent,
      deviceId: typeof body?.deviceId === 'string' ? body.deviceId : undefined,
    })

    if (!result.success) {
      const status = result.errorCode === 'RATE_LIMITED' ? 429 : 400
      return NextResponse.json(
        { success: false, error: result.error, errorCode: result.errorCode, resendAfter: result.resendAfter },
        { status },
      )
    }

    return NextResponse.json({
      success: true,
      maskedPhone: result.maskedPhone,
      expiresIn: result.expiresIn,
      resendAfter: result.resendAfter,
    })
  } catch (error) {
    console.error('[api/whatsapp/send-otp] Unhandled error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.', errorCode: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
