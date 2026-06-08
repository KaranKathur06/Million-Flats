import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { verifyPaymentSignature, fetchRazorpayPayment, fetchRazorpayOrder } from '@/lib/razorpay'
import { PLAN_LIMITS } from '@/lib/subscriptionPlans'

export const runtime = 'nodejs'

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  paymentId: z.string().uuid().optional(), // Internal payment record ID
})

/**
 * POST /api/agent/payments/verify
 * 
 * Verifies Razorpay payment and activates subscription
 * 
 * Security:
 *   - Verifies HMAC SHA256 signature (prevents tampering)
 *   - Fetches payment from Razorpay API (confirms actual payment)
 *   - Uses transaction for atomic subscription update
 * 
 * Request body:
 *   - razorpay_order_id: Razorpay order ID
 *   - razorpay_payment_id: Razorpay payment ID
 *   - razorpay_signature: HMAC signature from Razorpay
 *   - paymentId: (optional) Internal payment record ID
 * 
 * Response:
 *   - success: true/false
 *   - subscription: Updated subscription details
 */
export async function POST(req: Request) {
  try {
    // Authenticate agent
    const auth = await requireAgentProfileSession()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      )
    }

    // Parse and validate request
    const body = await req.json().catch(() => null)
    const parsed = VerifyPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = parsed.data

    // Step 1: Verify signature (CRITICAL SECURITY CHECK)
    const isValidSignature = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!isValidSignature) {
      console.error('Payment signature verification failed', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        agentId: auth.agentId,
      })
      return NextResponse.json(
        { success: false, message: 'Payment verification failed. Please contact support.' },
        { status: 400 }
      )
    }

    // Step 2: Find payment record
    const payment = await (prisma as any).payment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        agentId: auth.agentId,
      },
      include: {
        subscription: true,
      },
    })

    if (!payment) {
      console.error('Payment record not found', { orderId: razorpay_order_id, agentId: auth.agentId })
      return NextResponse.json(
        { success: false, message: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Step 3: Check if already processed (idempotency)
    if (payment.status === 'CAPTURED' && payment.razorpayPaymentId) {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        subscription: payment.subscription,
        payment: { id: payment.id, status: payment.status },
      })
    }

    // Step 4: Fetch payment details from Razorpay (confirm actual payment)
    let razorpayPayment: any
    try {
      razorpayPayment = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (error) {
      console.error('Failed to fetch Razorpay payment', error)
      return NextResponse.json(
        { success: false, message: 'Failed to verify payment with provider' },
        { status: 500 }
      )
    }

    // Step 5: Verify payment status from Razorpay
    if (razorpayPayment.status !== 'captured') {
      // Update payment status
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          status: razorpayPayment.status.toUpperCase(),
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          failureReason: razorpayPayment.error_description,
          failureCode: razorpayPayment.error_code,
        },
      })

      return NextResponse.json({
        success: false,
        message: `Payment not captured. Status: ${razorpayPayment.status}`,
        paymentStatus: razorpayPayment.status,
      }, { status: 400 })
    }

    // Step 6: Calculate subscription dates
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + payment.subscriptionDays)

    // Get plan limits
    const planLimits = PLAN_LIMITS[payment.plan as keyof typeof PLAN_LIMITS]

    // Step 7: Create/update subscription and payment in transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          amountPaid: razorpayPayment.amount,
          paidAt: now,
          notes: {
            ...(payment.notes || {}),
            razorpay_payment_id: razorpay_payment_id,
            verified_at: now.toISOString(),
            payment_method: razorpayPayment.method,
          },
        },
      })

      // Upsert subscription
      const existingSub = await tx.agentSubscription.findUnique({
        where: { agentId: auth.agentId },
      })

      let subscription
      if (existingSub) {
        // Extend existing subscription
        const baseDate = existingSub.endDate && existingSub.endDate > now
          ? existingSub.endDate
          : now

        const newEndDate = new Date(baseDate)
        newEndDate.setDate(newEndDate.getDate() + payment.subscriptionDays)

        subscription = await tx.agentSubscription.update({
          where: { agentId: auth.agentId },
          data: {
            plan: payment.plan,
            status: 'ACTIVE',
            endDate: newEndDate,
            startDate: existingSub.startDate || now,
            cancelledAt: null, // Clear any previous cancellation
            listingsLimit: planLimits.listingLimit,
            featuredLimit: planLimits.featuredLimit,
            leadPriority: planLimits.leadPriority,
            verixAccessLevel: planLimits.verixAccessLevel,
            provider: 'RAZORPAY',
            providerSubscriptionId: razorpay_payment_id,
          },
        })
      } else {
        // Create new subscription
        subscription = await tx.agentSubscription.create({
          data: {
            agentId: auth.agentId,
            plan: payment.plan,
            status: 'ACTIVE',
            startDate: now,
            endDate,
            listingsLimit: planLimits.listingLimit,
            featuredLimit: planLimits.featuredLimit,
            leadPriority: planLimits.leadPriority,
            verixAccessLevel: planLimits.verixAccessLevel,
            provider: 'RAZORPAY',
            providerSubscriptionId: razorpay_payment_id,
          },
        })
      }

      // Link payment to subscription
      await tx.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      })

      return { payment: updatedPayment, subscription }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        id: result.subscription.id,
        plan: result.subscription.plan,
        status: result.subscription.status,
        startDate: result.subscription.startDate,
        endDate: result.subscription.endDate,
        listingsLimit: result.subscription.listingsLimit,
        featuredLimit: result.subscription.featuredLimit,
      },
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        status: result.payment.status,
      },
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    const message = error instanceof Error ? error.message : 'Payment verification failed'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
