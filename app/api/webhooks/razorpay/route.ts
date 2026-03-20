import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/razorpay'
import { PLAN_LIMITS } from '@/lib/subscriptionPlans'

export const runtime = 'nodejs'

/**
 * Razorpay Webhook Handler
 * 
 * Handles webhook events from Razorpay:
 * - payment.captured: Payment successful
 * - payment.failed: Payment failed
 * - payment.refunded: Payment refunded
 * - order.paid: Order fully paid
 * 
 * Security:
 * - Verifies webhook signature using HMAC SHA256
 * - Implements idempotency using event ID
 * - Logs all webhook events for audit
 */

interface WebhookEvent {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: {
        id: string
        order_id: string
        amount: number
        currency: string
        status: string
        method: string
        amount_refunded: number
        refund_status: string | null
        captured: boolean
        email: string
        contact: string
        notes: Record<string, string>
        fee: number
        tax: number
        error_code: string | null
        error_description: string | null
        created_at: number
      }
    }
    order?: {
      entity: {
        id: string
        amount: number
        amount_paid: number
        amount_due: number
        currency: string
        receipt: string
        status: string
        attempts: number
        notes: Record<string, string>
        created_at: number
      }
    }
  }
  created_at: number
}

/**
 * Generate idempotency key from event
 */
function generateIdempotencyKey(event: WebhookEvent): string {
  return `razorpay_${event.event}_${event.payload.payment?.entity.id || event.payload.order?.entity.id}`
}

/**
 * POST /api/webhooks/razorpay
 * 
 * Razorpay webhook endpoint
 * 
 * Headers:
 *   - X-Razorpay-Signature: HMAC signature
 * 
 * Body: Webhook event JSON
 */
export async function POST(req: Request) {
  const startTime = Date.now()

  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    if (!signature) {
      console.error('Webhook missing signature header')
      return NextResponse.json(
        { success: false, message: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Webhook signature verification failed')
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse event
    const event: WebhookEvent = JSON.parse(rawBody)
    console.log(`Webhook received: ${event.event}`, {
      eventId: event.account_id,
      paymentId: event.payload.payment?.entity.id,
      orderId: event.payload.order?.entity.id,
    })

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(event)

    // Check if event already processed (idempotency)
    const existingWebhook = await (prisma as any).paymentWebhook.findUnique({
      where: { idempotencyKey },
      select: { id: true, processed: true },
    })

    if (existingWebhook?.processed) {
      console.log(`Webhook already processed: ${idempotencyKey}`)
      return NextResponse.json({
        success: true,
        message: 'Event already processed',
        idempotencyKey,
      })
    }

    // Create webhook record
    const webhookRecord = await (prisma as any).paymentWebhook.create({
      data: {
        razorpayEventId: event.account_id,
        eventType: event.event,
        payload: event.payload as any,
        signature,
        idempotencyKey,
        processed: false,
      },
    })

    // Process event based on type
    let processingError: string | null = null
    let paymentId: string | null = null

    try {
      switch (event.event) {
        case 'payment.captured':
          paymentId = await handlePaymentCaptured(event, webhookRecord.id)
          break

        case 'payment.failed':
          paymentId = await handlePaymentFailed(event, webhookRecord.id)
          break

        case 'payment.refunded':
          paymentId = await handlePaymentRefunded(event, webhookRecord.id)
          break

        case 'order.paid':
          paymentId = await handleOrderPaid(event, webhookRecord.id)
          break

        default:
          console.log(`Unhandled webhook event: ${event.event}`)
      }

      // Mark webhook as processed
      await (prisma as any).paymentWebhook.update({
        where: { id: webhookRecord.id },
        data: {
          processed: true,
          processedAt: new Date(),
          paymentId,
        },
      })
    } catch (error) {
      processingError = error instanceof Error ? error.message : 'Processing failed'
      console.error(`Webhook processing error: ${event.event}`, error)

      // Update webhook with error
      await (prisma as any).paymentWebhook.update({
        where: { id: webhookRecord.id },
        data: {
          processed: false,
          processingError,
          retryCount: { increment: 1 },
        },
      })
    }

    const duration = Date.now() - startTime
    console.log(`Webhook processed in ${duration}ms`, {
      event: event.event,
      processed: !processingError,
      paymentId,
    })

    return NextResponse.json({
      success: true,
      event: event.event,
      processed: !processingError,
      error: processingError,
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(event: WebhookEvent, webhookId: string): Promise<string | null> {
  const payment = event.payload.payment?.entity
  if (!payment) return null

  // Find payment record
  const paymentRecord = await (prisma as any).payment.findFirst({
    where: { razorpayOrderId: payment.order_id },
    include: { subscription: true },
  })

  if (!paymentRecord) {
    console.error(`Payment record not found for order: ${payment.order_id}`)
    return null
  }

  // Skip if already captured
  if (paymentRecord.status === 'CAPTURED') {
    return paymentRecord.id
  }

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + paymentRecord.subscriptionDays)

  const planLimits = PLAN_LIMITS[paymentRecord.plan as keyof typeof PLAN_LIMITS]

  // Update payment and subscription in transaction
  const result = await (prisma as any).$transaction(async (tx: any) => {
    // Update payment
    const updatedPayment = await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: 'CAPTURED',
        razorpayPaymentId: payment.id,
        amountPaid: payment.amount,
        paidAt: now,
        notes: {
          ...(paymentRecord.notes || {}),
          webhook_captured: now.toISOString(),
          payment_method: payment.method,
        },
      },
    })

    // Upsert subscription
    const existingSub = await tx.agentSubscription.findUnique({
      where: { agentId: paymentRecord.agentId },
    })

    let subscription
    if (existingSub) {
      const baseDate = existingSub.endDate && existingSub.endDate > now
        ? existingSub.endDate
        : now

      const newEndDate = new Date(baseDate)
      newEndDate.setDate(newEndDate.getDate() + paymentRecord.subscriptionDays)

      subscription = await tx.agentSubscription.update({
        where: { agentId: paymentRecord.agentId },
        data: {
          plan: paymentRecord.plan,
          status: 'ACTIVE',
          endDate: newEndDate,
          cancelledAt: null,
          listingsLimit: planLimits.listingLimit,
          featuredLimit: planLimits.featuredLimit,
          leadPriority: planLimits.leadPriority,
          verixAccessLevel: planLimits.verixAccessLevel,
          provider: 'RAZORPAY',
          providerSubscriptionId: payment.id,
        },
      })
    } else {
      subscription = await tx.agentSubscription.create({
        data: {
          agentId: paymentRecord.agentId,
          plan: paymentRecord.plan,
          status: 'ACTIVE',
          startDate: now,
          endDate,
          listingsLimit: planLimits.listingLimit,
          featuredLimit: planLimits.featuredLimit,
          leadPriority: planLimits.leadPriority,
          verixAccessLevel: planLimits.verixAccessLevel,
          provider: 'RAZORPAY',
          providerSubscriptionId: payment.id,
        },
      })
    }

    // Link payment to subscription
    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: { subscriptionId: subscription.id },
    })

    return updatedPayment.id
  })

  return result
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(event: WebhookEvent, webhookId: string): Promise<string | null> {
  const payment = event.payload.payment?.entity
  if (!payment) return null

  const paymentRecord = await (prisma as any).payment.findFirst({
    where: { razorpayOrderId: payment.order_id },
  })

  if (!paymentRecord) return null

  await (prisma as any).payment.update({
    where: { id: paymentRecord.id },
    data: {
      status: 'FAILED',
      razorpayPaymentId: payment.id,
      failureReason: payment.error_description,
      failureCode: payment.error_code,
      notes: {
        ...(paymentRecord.notes || {}),
        webhook_failed: new Date().toISOString(),
        error_code: payment.error_code,
      },
    },
  })

  return paymentRecord.id
}

/**
 * Handle payment.refunded event
 */
async function handlePaymentRefunded(event: WebhookEvent, webhookId: string): Promise<string | null> {
  const payment = event.payload.payment?.entity
  if (!payment) return null

  const paymentRecord = await (prisma as any).payment.findFirst({
    where: { razorpayPaymentId: payment.id },
  })

  if (!paymentRecord) return null

  await (prisma as any).payment.update({
    where: { id: paymentRecord.id },
    data: {
      status: payment.amount_refunded >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      amountRefunded: payment.amount_refunded,
      refundedAt: new Date(),
      notes: {
        ...(paymentRecord.notes || {}),
        webhook_refunded: new Date().toISOString(),
        refund_status: payment.refund_status,
      },
    },
  })

  return paymentRecord.id
}

/**
 * Handle order.paid event (alternative to payment.captured)
 */
async function handleOrderPaid(event: WebhookEvent, webhookId: string): Promise<string | null> {
  const order = event.payload.order?.entity
  if (!order) return null

  const payment = event.payload.payment?.entity
  if (!payment) return null

  // Treat same as payment.captured
  return handlePaymentCaptured({
    ...event,
    payload: { payment: { entity: payment } },
  }, webhookId)
}
