import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RateEntry = { count: number; resetAt: number }

const ipRate = new Map<string, RateEntry>()
const emailRate = new Map<string, RateEntry>()

function getClientIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

function allow(rate: Map<string, RateEntry>, key: string, max: number, windowMs: number) {
  const now = Date.now()
  const cur = rate.get(key)
  if (!cur || cur.resetAt <= now) {
    rate.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (cur.count >= max) return false
  cur.count += 1
  return true
}

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const windowMs = 10 * 60 * 1000
    if (!allow(ipRate, ip, 20, windowMs)) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)

    const email = safeString(body?.email).toLowerCase()
    const otp = safeString(body?.otp)
    const type = safeString(body?.type)

    if (!email || !otp || !type) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'user' && type !== 'agent') {
      return NextResponse.json({ success: false, message: 'Invalid user type' }, { status: 400 })
    }

    if (!allow(emailRate, email, 10, windowMs)) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 })
    }

    if (user.verified) {
      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }).catch(() => null)
      return NextResponse.json({ success: true, message: 'Verification successful' }, { status: 200 })
    }

    const tokenRow = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, token: otp },
      orderBy: { createdAt: 'desc' },
    })

    if (!tokenRow) {
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 })
    }

    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerificationToken.delete({ where: { id: tokenRow.id } })
      return NextResponse.json({ success: false, message: 'OTP expired' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, emailVerified: true, emailVerifiedAt: new Date() } as any,
    })

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true, message: 'Verification successful' }, { status: 200 })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
