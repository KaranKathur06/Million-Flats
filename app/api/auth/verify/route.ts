import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    const email = safeString(body?.email).toLowerCase()
    const otp = safeString(body?.otp)
    const type = safeString(body?.type)

    if (!email || !otp || !type) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'user') {
      return NextResponse.json({ success: false, message: 'Invalid user type' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 })
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
      data: { verified: true },
    })

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true, message: 'Verification successful' }, { status: 200 })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
