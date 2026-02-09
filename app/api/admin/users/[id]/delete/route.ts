import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
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
  const auth = await requireRole('SUPERADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_USER_DELETED',
    windowMs: 60_000,
    max: 5,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const userId = String(params?.id || '').trim()
  if (!userId) return bad('Not found', 404)

  if (userId === auth.userId) {
    return bad('Cannot delete your own account', 409)
  }

  const user = await (prisma as any).user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, verified: true, createdAt: true },
  })

  if (!user) return bad('Not found', 404)

  const targetRole = String((user as any).role || '').toUpperCase()
  if (targetRole === 'SUPERADMIN') {
    const superadminCount = await (prisma as any).user.count({ where: { role: 'SUPERADMIN' as any } })
    if (superadminCount <= 1) {
      return bad('Cannot delete the last SUPERADMIN', 409)
    }
  }

  const beforeState = {
    email: String((user as any).email || ''),
    role: String((user as any).role || 'USER'),
    status: String((user as any).status || 'ACTIVE'),
    verified: Boolean((user as any).verified),
    createdAt: (user as any).createdAt ? new Date((user as any).createdAt).toISOString() : null,
  }

  await (prisma as any).user.delete({ where: { id: userId } })

  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'ADMIN_USER_DELETED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState: { deleted: true },
    meta: {
      actor: 'admin',
      targetEmail: String((user as any).email || ''),
      targetRole: String((user as any).role || 'USER'),
    },
  })

  return NextResponse.json({ success: true })
}
