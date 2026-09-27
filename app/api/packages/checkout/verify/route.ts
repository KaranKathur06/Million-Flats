import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { fetchRazorpayOrder, fetchRazorpayPayment, isRazorpayConfigured, verifyPaymentSignature } from '@/lib/razorpay'
import { activatePackagePurchase } from '@/lib/packagePurchaseActivation'

export const runtime = 'nodejs'

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  purchaseId: z.string().uuid(),
})

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ success: false, message: 'Payment verification is temporarily unavailable.' }, { status: 503 })
  }

  const parsed = VerifySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Payment details are incomplete.' }, { status: 400 })
  }

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, purchaseId } = parsed.data
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ success: false, message: 'Payment verification failed. Please contact support.' }, { status: 400 })
  }

  const db = prisma as any
  const purchase = await db.packagePurchase.findFirst({ where: { id: purchaseId, razorpayOrderId: orderId } })
  if (!purchase) {
    return NextResponse.json({ success: false, message: 'Purchase record not found.' }, { status: 404 })
  }
  if (purchase.status === 'PAID') {
    if (purchase.razorpayPaymentId !== paymentId) {
      return NextResponse.json({ success: false, message: 'This purchase is already confirmed with a different payment.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, purchase: { id: purchase.id, status: purchase.status, packageName: purchase.packageName, purchaserEmail: purchase.purchaserEmail, amount: purchase.totalAmount, currency: purchase.currency } })
  }

  try {
    const [order, payment] = await Promise.all([
      fetchRazorpayOrder(orderId),
      fetchRazorpayPayment(paymentId),
    ])
    if (payment.order_id !== orderId || payment.status !== 'captured' || order.amount !== purchase.totalAmount || payment.amount !== purchase.totalAmount || order.currency !== purchase.currency || payment.currency !== purchase.currency) {
      return NextResponse.json({ success: false, message: 'Payment is not captured for the expected amount.' }, { status: 409 })
    }

    const paidAt = new Date(payment.created_at * 1000)
    await db.packagePurchase.update({ where: { id: purchase.id }, data: { razorpaySignature: signature } })
    const { purchase: confirmed } = await activatePackagePurchase({ purchaseId: purchase.id, paymentId, paidAt })

    return NextResponse.json({
      success: true,
      purchase: {
        id: confirmed.id,
        status: confirmed.status,
        packageName: confirmed.packageName,
        purchaserEmail: confirmed.purchaserEmail,
        amount: confirmed.totalAmount,
        currency: confirmed.currency,
      },
    })
  } catch (error) {
    console.error('[POST /api/packages/checkout/verify]', error)
    return NextResponse.json({ success: false, message: 'Could not verify with the payment provider. Please retry.' }, { status: 502 })
  }
}