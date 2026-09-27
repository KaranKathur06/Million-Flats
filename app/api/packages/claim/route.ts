import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST() {
  const session = await getServerSession(authOptions)
  const sessionEmail = String(session?.user?.email || '').trim().toLowerCase()
  if (!sessionEmail) {
    return NextResponse.json({ success: false, message: 'Sign in to claim purchases for your account.' }, { status: 401 })
  }

  const db = prisma as any
  const user = await db.user.findFirst({
    where: { email: { equals: sessionEmail, mode: 'insensitive' }, emailVerified: true },
    select: { id: true, email: true },
  })
  if (!user) {
    return NextResponse.json({ success: false, message: 'Verify this email address before claiming purchases.' }, { status: 403 })
  }

  const normalizedEmail = String(user.email).trim().toLowerCase()
  const claimed = await db.$transaction(async (tx: any) => {
    const purchases = await tx.packagePurchase.updateMany({
      where: { purchaserEmail: normalizedEmail, status: 'PAID', OR: [{ userId: null }, { userId: user.id }] },
      data: { userId: user.id, claimedAt: new Date() },
    })
    const entitlements = await tx.packageEntitlement.updateMany({
      where: { purchaserEmail: normalizedEmail, status: 'ACTIVE', OR: [{ userId: null }, { userId: user.id }] },
      data: { userId: user.id, claimedAt: new Date() },
    })
    return { purchases: purchases.count, entitlements: entitlements.count }
  })

  return NextResponse.json({ success: true, claimed })
}