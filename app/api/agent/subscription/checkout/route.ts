import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { createRazorpayOrder, generateReceiptId, inrToPaise, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay'
import { PLAN_LIMITS } from '@/lib/subscriptionPlans'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const BodySchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
})

// Annual discount
const ANNUAL_DISCOUNT_PERCENT = 20

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

/**
 * Calculate price based on plan and billing cycle
 */
function calculatePrice(plan: 'BASIC' | 'PROFESSIONAL' | 'PREMIUM', billingCycle: 'MONTHLY' | 'ANNUAL'): {
  amountInr: number
  amountPaise: number
  subscriptionDays: number
} {
  const basePrice = PLAN_LIMITS[plan].price

  let amountInr: number
  let subscriptionDays: number

  if (billingCycle === 'ANNUAL') {
    amountInr = Math.round(basePrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100))
    subscriptionDays = 365
  } else {
    amountInr = basePrice
    subscriptionDays = 30
  }

  return {
    amountInr,
    amountPaise: inrToPaise(amountInr),
    subscriptionDays,
  }
}

/**
 * POST /api/agent/subscription/checkout
 * 
 * Creates a Razorpay order for subscription checkout
 * 
 * Request:
 *   - plan: BASIC | PROFESSIONAL | PREMIUM
 *   - billingCycle: MONTHLY | ANNUAL
 * 
 * Response:
 *   - success: true
 *   - order: { id, amount, currency }
 *   - keyId: Razorpay key ID for frontend
 *   - prefill: { name, email }
 */
export async function POST(req: Request) {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return bad(auth.message, auth.status)
  }

  // Check if Razorpay is configured
  if (!isRazorpayConfigured()) {
    return bad('Payment system not configured. Please contact support.', 503)
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return bad('Invalid payload. Plan and billingCycle are required.', 400)
  }

  const { plan, billingCycle } = parsed.data
  const { amountPaise, subscriptionDays } = calculatePrice(plan, billingCycle)

  try {
    // Check for existing pending order (reuse within 30 min)
    const existingPending = await (prisma as any).payment.findFirst({
      where: {
        agentId: auth.agentId,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: {
        id: true,
        razorpayOrderId: true,
        amount: true,
        plan: true,
        billingCycle: true,
      },
    })

    if (existingPending?.razorpayOrderId) {
      return NextResponse.json({
        success: true,
        order: {
          id: existingPending.razorpayOrderId,
          amount: existingPending.amount,
          currency: 'INR',
        },
        keyId: getRazorpayKeyId(),
        paymentId: existingPending.id,
        plan: existingPending.plan,
        billingCycle: existingPending.billingCycle,
        reused: true,
      })
    }

    // Generate receipt ID
    const receipt = generateReceiptId(auth.agentId)

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        agent_id: auth.agentId,
        plan,
        billing_cycle: billingCycle,
        subscription_days: String(subscriptionDays),
      },
    })

    // Create Payment record
    const payment = await (prisma as any).payment.create({
      data: {
        agentId: auth.agentId,
        razorpayOrderId: razorpayOrder.id,
        provider: 'RAZORPAY',
        status: 'PENDING',
        type: 'SUBSCRIPTION',
        amount: amountPaise,
        currency: 'INR',
        plan,
        billingCycle,
        subscriptionDays,
        notes: {
          razorpay_order_id: razorpayOrder.id,
          receipt,
        },
      },
      select: { id: true },
    })

    // Get agent details for prefill
    const agent = await (prisma as any).agent.findUnique({
      where: { id: auth.agentId },
      select: {
        user: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      keyId: getRazorpayKeyId(),
      paymentId: payment.id,
      plan,
      billingCycle,
      subscriptionDays,
      prefill: {
        name: agent?.user?.name || '',
        email: agent?.user?.email || '',
      },
    })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return bad(message, 500)
  }
}
