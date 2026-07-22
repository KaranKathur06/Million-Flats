import { NextResponse } from 'next/server'
import { VerificationService, VerificationErrorCode } from '@/lib/auth/verification-service'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = safeString(body?.email).toLowerCase()
    const otp = safeString(body?.otp)
    const type = safeString(body?.type)

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, code: VerificationErrorCode.MISSING_FIELDS, message: 'Email and verification code are required.' },
        { status: 400 }
      )
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, code: VerificationErrorCode.INVALID_FORMAT, message: 'OTP must be a 6-digit code.' },
        { status: 400 }
      )
    }

    const result = await VerificationService.verifyOtp(email, otp, type)

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message }, { status: 200 })
    }

    const status =
      result.code === VerificationErrorCode.ACCOUNT_LOCKED ? 429 :
      result.code === VerificationErrorCode.USER_NOT_FOUND ? 404 : 400

    return NextResponse.json(
      { success: false, code: result.code, message: result.message },
      { status }
    )
  } catch (error) {
    console.error('[verify] error', error)
    return NextResponse.json(
      { success: false, code: VerificationErrorCode.INTERNAL_ERROR, message: 'Internal server error.' },
      { status: 500 }
    )
  }
}
