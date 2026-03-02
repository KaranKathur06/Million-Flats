import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentProfileSession } from '@/lib/agentAuth'

export const runtime = 'nodejs'

const BodySchema = z.object({
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'PREMIUM']),
  provider: z.enum(['STRIPE', 'RAZORPAY']).optional(),
})

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function POST(req: Request) {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return bad(auth.message, auth.status)
  }

  const json = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return bad('Invalid payload', 400)
  }

  // Placeholder: real provider integration will create a checkout session.
  // We keep the contract stable for the pricing page CTA wiring.
  return NextResponse.json({
    success: true,
    message: 'Checkout integration not enabled yet',
    plan: parsed.data.plan,
    provider: parsed.data.provider || null,
  })
}
