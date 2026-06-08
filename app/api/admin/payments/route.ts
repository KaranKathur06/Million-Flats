import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { paiseToInr } from '@/lib/razorpay'

export const runtime = 'nodejs'

/**
 * GET /api/admin/payments
 * 
 * List all payments with filters (admin only)
 * 
 * Query params:
 *   - page: Page number
 *   - limit: Items per page
 *   - status: Filter by status
 *   - plan: Filter by plan
 *   - agentId: Filter by agent
 *   - search: Search by order/payment ID
 */
export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')))
  const status = url.searchParams.get('status')?.toUpperCase()
  const plan = url.searchParams.get('plan')?.toUpperCase()
  const agentId = url.searchParams.get('agentId')
  const search = url.searchParams.get('search')

  const where: any = {}
  if (status) where.status = status
  if (plan) where.plan = plan
  if (agentId) where.agentId = agentId
  if (search) {
    where.OR = [
      { razorpayOrderId: { contains: search, mode: 'insensitive' } },
      { razorpayPaymentId: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const [payments, total] = await Promise.all([
      (prisma as any).payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              id: true,
              company: true,
              user: { select: { name: true, email: true } },
            },
          },
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

    const transformedPayments = payments.map((p: any) => ({
      ...p,
      amountInr: paiseToInr(p.amount),
      amountPaidInr: paiseToInr(p.amountPaid),
      amountRefundedInr: paiseToInr(p.amountRefunded),
    }))

    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Admin payments list error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
