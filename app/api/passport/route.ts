import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { email?: string | null } | undefined
  if (!sessionUser?.email) {
    return NextResponse.json({ membership: null, pendingOrder: null }, { status: 200 })
  }

  const user = await prisma.user.findUnique({
    where: { email: String(sessionUser.email).trim().toLowerCase() },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ membership: null, pendingOrder: null }, { status: 200 })
  }

  const [membership, pendingOrder] = await Promise.all([
    prisma.passportMembership.findUnique({ where: { userId: user.id } }),
    prisma.passportOrder.findUnique({
      where: { userId: user.id },
      select: { id: true, category: true, status: true },
    }),
  ])

  return NextResponse.json({
    membership: membership
      ? {
          id: membership.id,
          category: membership.category,
          membershipNumber: membership.membershipNumber,
          status: membership.status,
          issueDate: membership.issueDate,
          qrCodeValue: membership.qrCodeValue,
          paymentReference: membership.paymentReference,
        }
      : null,
    pendingOrder: pendingOrder?.status === 'PENDING'
      ? { id: pendingOrder.id, category: pendingOrder.category }
      : null,
  })
}
