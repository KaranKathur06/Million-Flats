import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id, sourceType: 'MANUAL' },
    select: { id: true, status: true },
  })

  if (!property) return bad('Not found', 404)
  if (String(property.status) !== 'PENDING_REVIEW') return bad('Only pending listings can be approved.')

  const updated = await (prisma as any).manualProperty.update({
    where: { id },
    data: {
      status: 'APPROVED',
      rejectionReason: null,
    } as any,
    select: { id: true, status: true },
  })

  await writeAuditLog({
    entityType: 'MANUAL_PROPERTY',
    entityId: id,
    action: 'ADMIN_APPROVED',
    performedByUserId: auth.userId,
    meta: { actor: 'admin' },
  })

  return NextResponse.json({ success: true, property: updated })
}
