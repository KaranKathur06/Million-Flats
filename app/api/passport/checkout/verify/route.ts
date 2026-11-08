import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  PASSPORT_CURRENCY,
  PASSPORT_PRICE_PAISE,
} from '@/lib/passport'
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '@/lib/razorpay'
import { activatePassportOrder } from '@/lib/passportPayments'

export const runtime = 'nodejs'

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(300),
  passportOrderId: z.string().uuid(),
}).strict()

export async function POST(request: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ success: false, message: 'Payment verification is temporarily unavailable.' }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { email?: string | null } | undefined
  if (!sessionUser?.email) {
    return NextResponse.json({ success: false, message: 'Sign in to verify this Passport payment.' }, { status: 401 })
  }

  const parsed = VerifySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Payment details are incomplete.' }, { status: 400 })
  }

  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    passportOrderId,
  } = parsed.data

  if (!verifyPaymentSignature({ orderId: razorpayOrderId, paymentId, signature })) {
    return NextResponse.json({ success: false, message: 'Payment verification failed. Please contact support.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email.trim().toLowerCase() },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 })
  }

  const order = await prisma.passportOrder.findFirst({
    where: { id: passportOrderId, userId: user.id, razorpayOrderId },
  })
  if (!order) {
    return NextResponse.json({ success: false, message: 'Passport order not found for this account.' }, { status: 404 })
  }

  if (order.status === 'PAID') {
    if (order.razorpayPaymentId !== paymentId) {
      return NextResponse.json({ success: false, message: 'This Passport order was confirmed with a different payment.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, alreadyPaid: true })
  }

  try {
    const [providerOrder, payment] = await Promise.all([
      fetchRazorpayOrder(razorpayOrderId),
      fetchRazorpayPayment(paymentId),
    ])

    if (
      providerOrder.id !== razorpayOrderId
      || payment.order_id !== razorpayOrderId
      || payment.status !== 'captured'
      || providerOrder.amount !== PASSPORT_PRICE_PAISE
      || payment.amount !== PASSPORT_PRICE_PAISE
      || order.amount !== PASSPORT_PRICE_PAISE
      || providerOrder.currency !== PASSPORT_CURRENCY
      || payment.currency !== PASSPORT_CURRENCY
      || order.currency !== PASSPORT_CURRENCY
    ) {
      return NextResponse.json({
        success: false,
        message: 'Payment is not captured for the expected Passport price.',
      }, { status: 409 })
    }

    const result = await activatePassportOrder({
      orderId: order.id,
      razorpayOrderId,
      paymentId,
      signature,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: new Date(payment.created_at * 1000),
    })

    return NextResponse.json({
      success: true,
      membership: {
        id: result.membership.id,
        category: result.membership.category,
        membershipNumber: result.membership.membershipNumber,
        status: result.membership.status,
        issueDate: result.membership.issueDate,
        qrCodeValue: result.membership.qrCodeValue,
      },
    })
  } catch (error) {
    console.error('[POST /api/passport/checkout/verify]', error)
    return NextResponse.json({
      success: false,
      message: 'Could not verify with the payment provider. Please retry verification.',
    }, { status: 502 })
  }
}
