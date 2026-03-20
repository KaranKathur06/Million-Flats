import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

const UpdatePlanPriceSchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
  price: z.number().positive(), // in INR
  razorpayPlanId: z.string().optional(),
  isActive: z.boolean().optional(),
  features: z.record(z.any()).optional(),
})

/**
 * GET /api/admin/payments/plans
 * 
 * List all subscription plan prices
 */
export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  try {
    const plans = await (prisma as any).subscriptionPlanPrice.findMany({
      orderBy: [{ plan: 'asc' }, { billingCycle: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      plans: plans.map((p: any) => ({
        ...p,
        priceInr: p.price / 100, // Convert paise to INR for display
      })),
    })
  } catch (error) {
    console.error('List plan prices error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch plan prices' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payments/plans
 * 
 * Create or update a subscription plan price
 */
export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck

  try {
    const body = await req.json()
    const parsed = UpdatePlanPriceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request', errors: parsed.error.errors },
        { status: 400 }
      )
    }

    const { plan, billingCycle, price, razorpayPlanId, isActive, features } = parsed.data

    // Convert INR to paise for storage
    const pricePaise = Math.round(price * 100)

    const planPrice = await (prisma as any).subscriptionPlanPrice.upsert({
      where: {
        plan_billingCycle: { plan, billingCycle },
      },
      create: {
        plan,
        billingCycle,
        price: pricePaise,
        razorpayPlanId,
        isActive: isActive ?? true,
        features,
      },
      update: {
        price: pricePaise,
        razorpayPlanId,
        isActive,
        features,
      },
    })

    return NextResponse.json({
      success: true,
      plan: {
        ...planPrice,
        priceInr: planPrice.price / 100,
      },
    })
  } catch (error) {
    console.error('Update plan price error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update plan price' },
      { status: 500 }
    )
  }
}
