import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

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

function normalizeRole(v: unknown) {
  const s = safeString(v).toUpperCase()
  if (s === 'AGENT' || s === 'USER') return s
  return ''
}

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const windowMs = 10 * 60 * 1000

  if (!allow(ipRate, ip, 30, windowMs)) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const email = safeString(body?.email).toLowerCase()
  const otp = safeString(body?.otp)
  const role = normalizeRole(body?.role)

  if (!email || !otp || !role) {
    return NextResponse.json({ success: false, code: 'MISSING_FIELDS', message: 'Missing required fields.' }, { status: 400 })
  }

  if (!allow(emailRate, `${email}:${role}`, 20, windowMs)) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const now = Date.now()
  const active = await (prisma as any).loginOtp
    .findFirst({
      where: {
        email,
        role,
        consumed: false,
        usedAt: null,
        expiresAt: { gt: new Date(now) },
      },
      orderBy: { createdAt: 'desc' },
    })
    .catch(() => null)

  if (!active) {
    return NextResponse.json({ success: false, code: 'OTP_INVALID', message: 'Invalid OTP.' }, { status: 400 })
  }

  const attempts = typeof active.attempts === 'number' ? active.attempts : 0
  if (attempts >= 5) {
    await (prisma as any).loginOtp.update({ where: { id: active.id }, data: { consumed: true } }).catch(() => null)
    return NextResponse.json({ success: false, code: 'OTP_LOCKED', message: 'Too many invalid attempts. Please request a new code.' }, { status: 429 })
  }

  const ok = hash(otp) === String(active.codeHash || '')
  if (!ok) {
    await (prisma as any).loginOtp.update({ where: { id: active.id }, data: { attempts: attempts + 1 } }).catch(() => null)
    return NextResponse.json({ success: false, code: 'OTP_INVALID', message: 'Invalid OTP.' }, { status: 400 })
  }

  const loginToken = crypto.randomBytes(32).toString('hex')
  const loginTokenHash = hash(loginToken)
  const loginTokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await (prisma as any).loginOtp
    .update({
      where: { id: active.id },
      data: {
        consumed: true,
        ipAddress: active.ipAddress || ip,
        loginTokenHash,
        loginTokenExpiresAt,
      },
    })
    .catch(() => null)

  await (prisma as any).user.update({
    where: { email },
    data: {
      verified: true,
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  }).catch(() => null)

  return NextResponse.json(
    {
      success: true,
      email,
      role,
      loginToken,
      message: 'OTP verified.',
    },
    { status: 200 }
  )
}
