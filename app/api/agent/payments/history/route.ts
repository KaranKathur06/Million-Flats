import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { paiseToInr } from '@/lib/razorpay'

export const runtime = 'nodejs'

/**
 * GET /api/agent/payments/history
 * 
 * Returns payment history for the authenticated agent
 * 
 * Query params:
 *   - page: Page number (default 1)
 *   - limit: Items per page (default 10, max 50)
 *   - status: Filter by status (optional)
 * 
 * Response:
 *   - success: true
 *   - payments: Array of payment records
 *   - pagination: { page, limit, total, totalPages }
 */
export async function GET(req: Request) {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    )
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')))
  const status = url.searchParams.get('status')?.toUpperCase()

  const where: any = { agentId: auth.agentId }
  if (status) {
    where.status = status
  }

  try {
    const [payments, total] = await Promise.all([
      (prisma as any).payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
          provider: true,
          status: true,
          type: true,
          amount: true,
          currency: true,
          amountPaid: true,
          amountRefunded: true,
          plan: true,
          billingCycle: true,
          subscriptionDays: true,
          failureReason: true,
          paidAt: true,
          refundedAt: true,
          createdAt: true,
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              endDate: true,
            },
          },
        },
      }),
      (prisma as any).payment.count({ where }),
    ])

    // Transform amounts from paise to INR for display
    const transformedPayments = payments.map((p: any) => ({
      ...p,
      amountInr: paiseToInr(p.amount),
      amountPaidInr: paiseToInr(p.amountPaid),
      amountRefundedInr: paiseToInr(p.amountRefunded),
    }))

    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Payment history error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
