import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const BodySchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'restore', 'restore_published', 'mark_sold', 'reject', 'draft']),
  reason: z.string().max(1000).optional(),
})

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid lifecycle action' }, { status: 400 })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: `MANUAL_PROPERTY_${parsed.data.action.toUpperCase()}`,
    windowMs: 60_000,
    max: 60,
  })
  if (!limit.ok) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 })
  }

  const result = await applyManualPropertyAdminAction({
    propertyId: params.id,
    action: parsed.data.action,
    actorUserId: auth.userId,
    ipAddress: getIp(req),
    reason: parsed.data.reason || null,
  })

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status })
  }

  return NextResponse.json({ success: true, property: result.property })
}
