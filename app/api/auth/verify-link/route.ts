import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function candidateHashesFor(token: string) {
  const peppersEnv = (process.env.TOKEN_PEPPERS || process.env.TOKEN_PEPPER || '')
  const peppers = peppersEnv.split(',').map(s => s.trim()).filter(Boolean)
  if (peppers.length) return peppers.map(p => crypto.createHmac('sha256', p).update(token).digest('hex'))
  return [crypto.createHash('sha256').update(token).digest('hex')]
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = safeString(url.searchParams.get('token'))
    if (!token) return NextResponse.json({ success: false, message: 'Missing token' }, { status: 400 })

    const candidateHashes = candidateHashesFor(token)
    const now = new Date()

    const row = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash: { in: candidateHashes }, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)

    if (!row) return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 400 })

    await prisma.emailVerificationToken.updateMany({
      where: { userId: row.userId, tokenHash: row.tokenHash },
      data: { usedAt: now } as any,
    }).catch(() => null)

    await prisma.user.update({
      where: { id: row.userId },
      data: { verified: true, emailVerified: true, emailVerifiedAt: now } as any,
    }).catch(() => null)

    // Redirect to success page
    const frontendBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://millionflats.com'
    return NextResponse.redirect(`${frontendBase.replace(/\/$/, '')}/auth/verified`)
  } catch (err) {
    console.error('[verify-link] error', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const token = safeString(body?.token)
    if (!token) return NextResponse.json({ success: false, message: 'Missing token' }, { status: 400 })
    const candidateHashes = candidateHashesFor(token)
    const now = new Date()

    const row = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash: { in: candidateHashes }, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)

    if (!row) return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 400 })

    await prisma.emailVerificationToken.updateMany({ where: { userId: row.userId, tokenHash: row.tokenHash }, data: { usedAt: now } as any }).catch(() => null)

    await prisma.user.update({ where: { id: row.userId }, data: { verified: true, emailVerified: true, emailVerifiedAt: now } as any }).catch(() => null)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify-link-post] error', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
