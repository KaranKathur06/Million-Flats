import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  PASSPORT_CATEGORY_META,
  PASSPORT_CURRENCY,
  PASSPORT_PRICE_PAISE,
} from '@/lib/passport'
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay'

export const runtime = 'nodejs'

const categories = Object.keys(PASSPORT_CATEGORY_META) as [
  keyof typeof PASSPORT_CATEGORY_META,
  ...Array<keyof typeof PASSPORT_CATEGORY_META>,
]

const OrderSchema = z.object({
  category: z.enum(categories),
}).strict()

function orderResponse(order: {
  id: string
  category: keyof typeof PASSPORT_CATEGORY_META
  razorpayOrderId: string | null
}) {
  return {
    success: true,
    orderId: order.razorpayOrderId,
    passportOrderId: order.id,
    category: order.category,
    amount: PASSPORT_PRICE_PAISE,
    currency: PASSPORT_CURRENCY,
    keyId: getRazorpayKeyId(),
  }
}

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ success: false, message: 'Secure checkout is temporarily unavailable.' }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { email?: string | null } | undefined
  if (!sessionUser?.email) {
    return NextResponse.json({ success: false, message: 'Sign in to purchase a MillionFlats Passport.' }, { status: 401 })
  }

  const parsed = OrderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Choose a valid Passport category.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, status: true },
  })
  if (!user || user.status !== 'ACTIVE') {
    return NextResponse.json({ success: false, message: 'An active MillionFlats account is required.' }, { status: 403 })
  }

  const membership = await prisma.passportMembership.findUnique({ where: { userId: user.id } })
  if (membership) {
    return NextResponse.json({
      success: false,
      code: 'PASSPORT_EXISTS',
      message: 'This account already has a MillionFlats Passport.',
    }, { status: 409 })
  }

  const now = new Date()
  const leaseUntil = new Date(now.getTime() + 60_000)
  let order = await prisma.passportOrder.findUnique({ where: { userId: user.id } })

  if (order) {
    if (order.status === 'PAID') {
      return NextResponse.json({
        success: false,
        code: 'PASSPORT_EXISTS',
        message: 'This account already has a paid MillionFlats Passport.',
      }, { status: 409 })
    }
    if (order.category !== parsed.data.category) {
      return NextResponse.json({
        success: false,
        code: 'CATEGORY_LOCKED',
        message: 'A checkout is already associated with a different Passport category.',
      }, { status: 409 })
    }
    if (order.razorpayOrderId) {
      return NextResponse.json(orderResponse(order))
    }
    if (order.orderLeaseUntil && order.orderLeaseUntil > now) {
      return NextResponse.json({
        success: false,
        code: 'ORDER_CREATING',
        message: 'Passport checkout is being prepared. Please retry in a moment.',
      }, { status: 409 })
    }

    const lease = await prisma.passportOrder.updateMany({
      where: {
        id: order.id,
        status: 'PENDING',
        razorpayOrderId: null,
        OR: [{ orderLeaseUntil: null }, { orderLeaseUntil: { lte: now } }],
      },
      data: { orderLeaseUntil: leaseUntil },
    })
    if (lease.count !== 1) {
      return NextResponse.json({
        success: false,
        code: 'ORDER_CREATING',
        message: 'Passport checkout is being prepared. Please retry in a moment.',
      }, { status: 409 })
    }
    order = { ...order, orderLeaseUntil: leaseUntil }
  } else {
    const id = randomUUID()
    try {
      order = await prisma.passportOrder.create({
        data: {
          id,
          userId: user.id,
          category: parsed.data.category,
          amount: PASSPORT_PRICE_PAISE,
          currency: PASSPORT_CURRENCY,
          idempotencyKey: randomUUID(),
          providerReceipt: `MFP_${id.replace(/-/g, '').slice(0, 24)}`,
          orderLeaseUntil: leaseUntil,
        },
      })
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')) throw error
      const existing = await prisma.passportOrder.findUnique({ where: { userId: user.id } })
      if (existing?.razorpayOrderId && existing.category === parsed.data.category) {
        return NextResponse.json(orderResponse(existing))
      }
      return NextResponse.json({
        success: false,
        code: 'ORDER_CREATING',
        message: 'Passport checkout is being prepared. Please retry in a moment.',
      }, { status: 409 })
    }
  }

  try {
    const razorpayOrder = await createRazorpayOrder({
      amount: PASSPORT_PRICE_PAISE,
      currency: PASSPORT_CURRENCY,
      receipt: order.providerReceipt,
      notes: {
        passport_order_id: order.id,
        passport_category: order.category,
        user_id: user.id,
      },
    })

    if (razorpayOrder.amount !== PASSPORT_PRICE_PAISE || razorpayOrder.currency !== PASSPORT_CURRENCY) {
      throw new Error('Razorpay returned an order with an unexpected amount or currency')
    }

    const savedOrder = await prisma.passportOrder.update({
      where: { id: order.id },
      data: {
        razorpayOrderId: razorpayOrder.id,
        orderLeaseUntil: null,
        notes: { purchaserName: user.name, purchaserEmail: user.email },
      },
    })

    return NextResponse.json(orderResponse(savedOrder))
  } catch (error) {
    await prisma.passportOrder.updateMany({
      where: { id: order.id, razorpayOrderId: null },
      data: { orderLeaseUntil: new Date(0) },
    })
    console.error('[POST /api/passport/checkout/order]', error)
    return NextResponse.json({
      success: false,
      message: 'Could not create secure Passport checkout. Please retry.',
    }, { status: 502 })
  }
}
