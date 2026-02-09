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
  const auth = await requireRole('ADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_USER_EMAIL_VERIFIED',
    windowMs: 60_000,
    max: 30,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const userId = String(params?.id || '').trim()
  if (!userId) return bad('Not found', 404)

  const user = await (prisma as any).user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, verified: true, emailVerified: true, role: true, status: true },
  })

  if (!user) return bad('Not found', 404)

  const beforeState = {
    verified: Boolean((user as any).verified),
    emailVerified: (user as any).emailVerified ? new Date((user as any).emailVerified).toISOString() : null,
    role: String((user as any).role || 'USER'),
    status: String((user as any).status || 'ACTIVE'),
  }

  if (Boolean((user as any).verified) && Boolean((user as any).emailVerified)) {
    return bad('Conflict', 409)
  }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { verified: true, emailVerified: new Date() } as any,
    select: { id: true, email: true, verified: true, emailVerified: true, role: true, status: true },
  })

  const afterState = {
    verified: Boolean((updated as any).verified),
    emailVerified: (updated as any).emailVerified ? new Date((updated as any).emailVerified).toISOString() : null,
    role: String((updated as any).role || 'USER'),
    status: String((updated as any).status || 'ACTIVE'),
  }

  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'ADMIN_USER_EMAIL_VERIFIED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: { actor: 'admin', targetEmail: String((user as any).email || '') },
  })

  return NextResponse.json({ success: true, user: updated })
}
