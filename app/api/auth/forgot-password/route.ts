import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { buildAbsoluteUrl, sendEmail } from '@/lib/mailer'

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

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const windowMs = 15 * 60 * 1000

  if (!allow(ipRate, ip, 12, windowMs)) {
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' }, { status: 200 })
  }

  const body = await req.json().catch(() => null)
  const emailRaw = safeString(body?.email).toLowerCase()

  if (!emailRaw) {
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' }, { status: 200 })
  }

  if (!allow(emailRate, emailRaw, 3, windowMs)) {
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' }, { status: 200 })
  }

  const user = await prisma.user.findUnique({ where: { email: emailRaw } }).catch(() => null)

  if (!user || !user.password) {
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' }, { status: 200 })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000)

  await (prisma as any).passwordResetToken
    .deleteMany({ where: { userId: user.id } })
    .catch(() => null)

  await (prisma as any).passwordResetToken
    .create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      } as any,
    })
    .catch(() => null)

  const resetUrl = buildAbsoluteUrl(`/user/reset-password?token=${encodeURIComponent(token)}`)

  await sendEmail({
    to: user.email,
    subject: 'Reset your MillionFlats password',
    html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link expires in 20 minutes.</p>`,
  }).catch(() => null)

  return NextResponse.json({ success: true, message: 'If an account exists, a reset link will be sent.' }, { status: 200 })
}
