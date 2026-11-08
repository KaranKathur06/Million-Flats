import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireVideoAdvertiser } from '@/lib/videoReels/auth'
import { isVideoCampaignPaymentsEnabled } from '@/lib/videoReels/config'
import { VideoPaymentVerificationError, verifyAndCaptureVideoPayment } from '@/lib/videoReels/payments'

const BodySchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict()

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isVideoCampaignPaymentsEnabled()) {
    return NextResponse.json({ error: 'Campaign checkout is not available' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const auth = await requireVideoAdvertiser()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } })
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payment verification request' }, { status: 400 })

  try {
    const order = await verifyAndCaptureVideoPayment({
      campaignId: params.id,
      userId: auth.user.id,
      orderId: parsed.data.orderId,
      paymentId: parsed.data.paymentId,
      signature: parsed.data.signature,
    })
    return NextResponse.json({ success: true, status: order?.status || 'CAPTURED' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof VideoPaymentVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Video campaign payment verification failed', error)
    return NextResponse.json({ error: 'Payment verification is temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
