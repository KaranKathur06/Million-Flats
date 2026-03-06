import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import OTPEmail from '@/lib/email/templates/otpEmail'

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

function normalizeIntent(v: unknown) {
  const s = safeString(v).toLowerCase()
  if (s === 'agent' || s === 'user') return s
  return 'user'
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function hashOtp(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const windowMs = 15 * 60 * 1000

  if (!allow(ipRate, ip, 20, windowMs)) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const email = safeString(body?.email).toLowerCase()
  const password = safeString(body?.password)
  const intent = normalizeIntent(body?.intent)

  if (!email || !password) {
    return NextResponse.json({ success: false, code: 'MISSING_FIELDS', message: 'Email and password are required.' }, { status: 400 })
  }

  if (!allow(emailRate, email, 6, windowMs)) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email }, include: { agent: true } });
  } catch (error) {
    console.error('[login-otp/start] Database error when querying user:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'An internal database error occurred. If a recent site update was made, migrations might be missing.' },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json({ success: false, code: 'EMAIL_NOT_REGISTERED', message: 'No account found with this email. Please register first.' }, { status: 404 })
  }

  const status = String((user as any)?.status || '').toUpperCase()
  if (status === 'SUSPENDED') {
    return NextResponse.json({ success: false, code: 'ACCOUNT_DISABLED', message: 'Your account is disabled. Please contact support.' }, { status: 403 })
  }
  if (status === 'BANNED') {
    return NextResponse.json({ success: false, code: 'ACCOUNT_BANNED', message: 'Your account is banned. Please contact support.' }, { status: 403 })
  }

  const isEmailVerified = Boolean((user as any).emailVerified) || Boolean((user as any).verified)
  if (!isEmailVerified) {
    return NextResponse.json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to continue.' }, { status: 403 })
  }

  const passwordHash = typeof (user as any).password === 'string' ? String((user as any).password) : ''
  if (!passwordHash) {
    return NextResponse.json({ success: false, code: 'PASSWORD_NOT_SET', message: 'Password is not set for this account. Please reset your password.' }, { status: 400 })
  }

  const ok = await bcrypt.compare(password, passwordHash)
  if (!ok) {
    return NextResponse.json({ success: false, code: 'INVALID_PASSWORD', message: 'Invalid email or password.' }, { status: 401 })
  }

  const dbRole = String((user as any)?.role || '').toUpperCase()
  const isAgent = dbRole === 'AGENT' || Boolean((user as any)?.agent)

  if (intent === 'agent' && !isAgent) {
    return NextResponse.json({ success: false, code: 'AGENT_NOT_REGISTERED', message: 'This account is not registered as an agent. Apply as an agent to continue.' }, { status: 403 })
  }

  const roleForOtp = intent === 'agent' ? 'AGENT' : 'USER'

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const codeHash = hashOtp(otp)

  await (prisma as any).loginOtp
    .create({
      data: {
        id: crypto.randomUUID(),
        email,
        role: roleForOtp,
        codeHash,
        attempts: 0,
        expiresAt,
        consumed: false,
        ipAddress: ip,
      },
    })
    .catch(() => null)

  await sendEmail({
    to: email,
    subject: 'Your MillionFlats verification code',
    react: OTPEmail({ otp }),
  }).catch(() => null)

  return NextResponse.json({ success: true, requiresOtp: true, email, role: roleForOtp, message: 'OTP sent to your email.' }, { status: 200 })
}
