import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'

export const runtime = 'nodejs'

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
  return typeof v === 'string' ? v.trim() : ''
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  const windowMs = 15 * 60 * 1000
  const ip = getClientIp(req)

  if (!allow(ipRate, ip, 20, windowMs)) {
    return NextResponse.json({ success: true, message: 'If an account exists, a code will be sent.' }, { status: 200 })
  }

  const body = await req.json().catch(() => null)
  const email = safeString(body?.email).toLowerCase()
  const type = safeString(body?.type)

  if (!email || type !== 'user') {
    return NextResponse.json({ success: true, message: 'If an account exists, a code will be sent.' }, { status: 200 })
  }

  if (!allow(emailRate, email, 4, windowMs)) {
    return NextResponse.json({ success: true, message: 'If an account exists, a code will be sent.' }, { status: 200 })
  }

  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null)

  if (!user || user.verified) {
    return NextResponse.json({ success: true, message: 'If an account exists, a code will be sent.' }, { status: 200 })
  }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }).catch(() => null)
  await prisma.emailVerificationToken
    .create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
      },
    })
    .catch(() => null)

  await sendEmail({
    to: user.email,
    subject: 'Your MillionFlats verification code',
    html: `<p>Your verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
  }).catch(() => null)

  return NextResponse.json({ success: true, message: 'If an account exists, a code will be sent.' }, { status: 200 })
}
