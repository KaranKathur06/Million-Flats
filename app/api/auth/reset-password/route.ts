import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validatePasswordStrength } from '@/lib/auth/shared'

export const runtime = 'nodejs'

type RateEntry = { count: number; resetAt: number }

const ipRate = new Map<string, RateEntry>()

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
  if (!allow(ipRate, ip, 25, 15 * 60 * 1000)) {
    return NextResponse.json({ success: false, message: 'Reset failed. Please try again later.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const token = safeString(body?.token)
  const password = safeString(body?.password)
  const confirmPassword = safeString(body?.confirmPassword)

  if (!token) {
    return NextResponse.json({ success: false, message: 'Missing reset token.' }, { status: 400 })
  }

  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.isValid) {
    return NextResponse.json({ success: false, message: passwordValidation.errors.join(' • ') }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, message: 'Passwords do not match.' }, { status: 400 })
  }

  const tokenHash = hashToken(token)

  const row = await (prisma as any).passwordResetToken
    .findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
    .catch(() => null)

  if (!row) {
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: String(row.userId) } }).catch(() => null)
  if (!user) {
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const isEmailVerified = Boolean((user as any).emailVerified) || Boolean((user as any).verified)
  if (!isEmailVerified) {
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { password: hashed } as any }).catch(() => null)
    await (tx as any).passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }).catch(() => null)
    await (tx as any).passwordResetToken.deleteMany({ where: { userId: user.id, id: { not: row.id } } }).catch(() => null)
  }).catch(() => null)

  return NextResponse.json({ success: true }, { status: 200 })
}
