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
    action: 'ADMIN_ARCHIVED',
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
  if (String(property.status) !== 'APPROVED') return bad('Only published listings can be archived.')

  const beforeState = { status: String(property.status || 'APPROVED') }

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      archivedBy: auth.userId,
    } as any,
    select: { id: true, status: true, archivedAt: true },
  })

  const afterState = { status: String(updated.status || 'ARCHIVED'), archivedAt: updated.archivedAt ? new Date(updated.archivedAt).toISOString() : null }

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_ARCHIVED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: updated })
}
