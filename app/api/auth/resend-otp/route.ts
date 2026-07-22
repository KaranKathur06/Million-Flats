import { NextResponse } from 'next/server'
import { VerificationService, normalizeRole } from '@/lib/auth/verification-service'

export const runtime = 'nodejs'

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = safeString(body?.email).toLowerCase()
    const requestedType = safeString(body?.type)

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

    const result = await VerificationService.resendOtp(email, requestedType, ip)

    const status = result.success ? 200 : result.code === 'RATE_LIMITED' ? 429 : 400
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error('[resend-otp] error', error)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
