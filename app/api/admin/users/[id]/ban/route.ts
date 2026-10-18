import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbacServer'
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

  const result = await (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE', userId)
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true, verified: true, securityStateVersion: true },
    })
    if (!user) return { ok: false as const, status: 404, message: 'Not found' }

    const targetRole = String(user.role || '').toUpperCase()
    if (targetRole === 'SUPERADMIN') {
      return { ok: false as const, status: 403, message: 'Forbidden' }
    }
    if (user.status === 'BANNED') {
      return { ok: false as const, status: 409, message: 'Conflict' }
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { status: 'BANNED', securityStateVersion: { increment: 1 } },
      select: { id: true, email: true, role: true, status: true, verified: true, securityStateVersion: true },
    })
    await tx.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: userId,
        action: 'ADMIN_USER_BANNED',
        performedByUserId: auth.userId,
        ipAddress: getIp(req),
        beforeState: { role: user.role, status: user.status, securityStateVersion: user.securityStateVersion },
        afterState: { role: updated.role, status: updated.status, securityStateVersion: updated.securityStateVersion },
        meta: { actor: 'admin' },
      },
    })
    return { ok: true as const, user: updated }
  }, { isolationLevel: 'Serializable' })

  if (!result.ok) return bad(result.message, result.status)

  return NextResponse.json({ success: true, user: result.user })
}
