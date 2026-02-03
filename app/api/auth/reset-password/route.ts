import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const token = safeString(body?.token)
  const password = safeString(body?.password)
  const confirmPassword = safeString(body?.confirmPassword)

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, message: 'Passwords do not match' }, { status: 400 })
  }

  const tokenHash = hashToken(token)

  const row = await (prisma as any).passwordResetToken
    .findFirst({ where: { tokenHash } })
    .catch(() => null)

  if (!row || row.usedAt) {
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const expiresAt = row?.expiresAt ? new Date(row.expiresAt) : new Date(0)
  if (expiresAt.getTime() < Date.now()) {
    await (prisma as any).passwordResetToken.delete({ where: { id: row.id } }).catch(() => null)
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: String(row.userId) } }).catch(() => null)
  if (!user || !user.password) {
    return NextResponse.json({ success: false, message: 'Reset link is invalid or expired.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.update({ where: { id: user.id }, data: { password: hashed, verified: true } as any }).catch(() => null)
  await (prisma as any).passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }).catch(() => null)

  return NextResponse.json({ success: true }, { status: 200 })
}
