import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbacServer'
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
    action: 'ADMIN_USER_BANNED',
    windowMs: 60_000,
    max: 10,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const userId = String(params?.id || '').trim()
  if (!userId) return bad('Not found', 404)

  if (userId === auth.userId) {
    return bad('Cannot ban your own account', 409)
  }

  const user = await (prisma as any).user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  if (!user) return bad('Not found', 404)

  const targetRole = String((user as any).role || '').toUpperCase()
  if (targetRole === 'SUPERADMIN') {
    return bad('Forbidden', 403)
  }

  const targetStatus = String((user as any).status || 'ACTIVE').toUpperCase()
  if (targetStatus === 'BANNED') {
    return bad('Conflict', 409)
  }

  const beforeState = { role: String((user as any).role || 'USER'), status: String((user as any).status || 'ACTIVE') }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { status: 'BANNED' } as any,
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  const afterState = { role: String((updated as any).role || 'USER'), status: String((updated as any).status || 'BANNED') }

  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'ADMIN_USER_BANNED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: {
      actor: 'admin',
      targetEmail: String((user as any).email || ''),
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
