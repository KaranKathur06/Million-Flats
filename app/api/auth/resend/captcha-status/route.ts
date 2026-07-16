import { NextRequest, NextResponse } from 'next/server'
import { getRedis, getValue } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

export async function GET(req: NextRequest) {
  try {
    const email = safeString(req.nextUrl.searchParams.get('email'))
    if (!email) return NextResponse.json({ requireCaptcha: false })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ requireCaptcha: false })

    const captchaKey = `rl:resend:captcha:${email}`
    const v = await getValue(captchaKey)
    return NextResponse.json({ requireCaptcha: !!v })
  } catch (err) {
    console.error('[captcha-status] error', err)
    return NextResponse.json({ requireCaptcha: false })
  }
}
