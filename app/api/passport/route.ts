import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PASSPORT_CATEGORY_META } from '@/lib/passport'

export const runtime = 'nodejs'

const allowedCategories = Object.keys(PASSPORT_CATEGORY_META) as [keyof typeof PASSPORT_CATEGORY_META, ...Array<keyof typeof PASSPORT_CATEGORY_META>]

const ActivatePassportSchema = z.object({
  category: z.enum(allowedCategories),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { id?: string; email?: string | null; name?: string | null } | undefined
  if (!sessionUser?.email) {
    return NextResponse.json({ membership: null }, { status: 200 })
  }

  const user = await prisma.user.findUnique({
    where: { email: String(sessionUser.email).trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ membership: null }, { status: 200 })
  }

  const membership = await prisma.passportMembership.findUnique({
    where: { userId: user.id },
  })

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
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { id?: string; email?: string | null; name?: string | null } | undefined
  if (!sessionUser?.email) {
    return NextResponse.json({ success: false, message: 'Please sign in to activate a Passport.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = ActivatePassportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Choose a valid Passport category.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: String(sessionUser.email).trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ success: false, message: 'User account not found.' }, { status: 404 })
  }

  const existingMembership = await prisma.passportMembership.findUnique({
    where: { userId: user.id },
  })

  if (existingMembership) {
    return NextResponse.json({
      success: false,
      message: 'This account already has an active MillionFlats Passport. Category changes require admin review.',
    }, { status: 409 })
  }

  const category = parsed.data.category
  const membershipNumber = `MFP-${user.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`
  const qrCodeValue = `MQP-${membershipNumber}`

  const membership = await prisma.passportMembership.create({
    data: {
      userId: user.id,
      category,
      membershipNumber,
      status: 'ACTIVE',
      activatedAt: new Date(),
      paymentReference: `DIGITAL-${Date.now()}`,
      qrCodeValue,
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Passport activated successfully.',
    membership: {
      id: membership.id,
      category: membership.category,
      membershipNumber: membership.membershipNumber,
      status: membership.status,
      issueDate: membership.issueDate,
      qrCodeValue: membership.qrCodeValue,
      paymentReference: membership.paymentReference,
    },
  })
}
