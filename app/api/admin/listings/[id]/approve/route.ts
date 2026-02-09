import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

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

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_APPROVED',
    windowMs: 60_000,
    max: 30,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    select: { id: true, status: true },
  })

  if (!property) return bad('Not found', 404)
  if (String(property.status) !== 'PENDING_REVIEW') return bad('Only pending listings can be approved.')

  const beforeState = { status: String(property.status || 'PENDING_REVIEW') }

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'APPROVED',
      rejectionReason: null,
    } as any,
    select: { id: true, status: true },
  })

  const afterState = { status: String(updated.status || 'APPROVED') }

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_APPROVED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: updated })
}
