import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const RejectSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
})

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '')
  if (!id) return bad('Not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) return bad('Rejection reason is required.')

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    select: { id: true, status: true, sourceType: true },
  })

  if (!property) return bad('Not found', 404)
  if (String(property.sourceType) !== 'MANUAL') return bad('Only manual listings can be moderated.')
  if (String(property.status) !== 'PENDING_REVIEW') return bad('Only listings in PENDING_REVIEW can be rejected.')

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: parsed.data.reason,
    } as any,
    select: { id: true, status: true },
  })

  await (prisma as any).manualPropertyModerationLog.create({
    data: {
      propertyId: id,
      adminId: auth.userId,
      action: 'REJECT',
      reason: parsed.data.reason,
    } as any,
  })

  return NextResponse.json({ success: true, property: updated })
}
