import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import {
  createRazorpayOrder,
  generateReceiptId,
  inrToPaise,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from '@/lib/razorpay'
import { PLAN_LIMITS, normalizePlan } from '@/lib/subscriptionPlans'

export const runtime = 'nodejs'

const CreateOrderSchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
})

// Annual discount percentage
const ANNUAL_DISCOUNT_PERCENT = 20

/**
 * Calculate price based on plan and billing cycle
 */
function calculatePrice(plan: 'BASIC' | 'PROFESSIONAL' | 'PREMIUM', billingCycle: 'MONTHLY' | 'ANNUAL'): {
  amountInr: number
  amountPaise: number
  subscriptionDays: number
} {
  const basePrice = PLAN_LIMITS[plan].price // Monthly price in INR

  let amountInr: number
  let subscriptionDays: number

  if (billingCycle === 'ANNUAL') {
    // Annual: 12 months with discount
    amountInr = Math.round(basePrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100))
    subscriptionDays = 365
  } else {
    // Monthly
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
 * POST /api/agent/payments/create-order
 * 
 * Creates a Razorpay order for subscription purchase
 * 
 * Request body:
 *   - plan: BASIC | PROFESSIONAL | PREMIUM
 *   - billingCycle: MONTHLY | ANNUAL
 * 
 * Response:
 *   - success: true
 *   - order: { id, amount, currency, keyId }
 *   - payment: Payment record ID
 */
export async function POST(req: Request) {
  try {
    // Check Razorpay configuration
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Payment system not configured' },
        { status: 503 }
      )
    }

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
    const parsed = CreateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request parameters' },
        { status: 400 }
      )
    }

    const { plan, billingCycle } = parsed.data
    const { amountPaise, subscriptionDays } = calculatePrice(plan, billingCycle)

    // Check for existing pending order
    const existingPending = await (prisma as any).payment.findFirst({
      where: {
        agentId: auth.agentId,
        status: 'PENDING',
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Within last 30 min
      },
      select: {
        id: true,
        razorpayOrderId: true,
        amount: true,
        plan: true,
        billingCycle: true,
      },
    })

    // If valid pending order exists, return it instead of creating new
    if (existingPending?.razorpayOrderId) {
      return NextResponse.json({
        success: true,
        orderId: existingPending.razorpayOrderId,
        amount: existingPending.amount,
        currency: 'INR',
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

    // Create Payment record in database
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
          created_by: auth.userId,
        },
      },
      select: {
        id: true,
        razorpayOrderId: true,
        amount: true,
      },
    })

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: getRazorpayKeyId(),
      paymentId: payment.id,
      plan,
      billingCycle,
      subscriptionDays,
    })
  } catch (error) {
    console.error('Create order error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create order'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
