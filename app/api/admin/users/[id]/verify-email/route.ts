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
    select: {
      id: true,
      email: true,
      emailVerified: true,
      emailVerifiedAt: true,
      emailVerifiedByAdminId: true,
      role: true,
      status: true,
    },
  })

  if (!user) return bad('Not found', 404)

  const alreadyVerified = Boolean((user as any).emailVerified)
  if (alreadyVerified) {
    return NextResponse.json({ success: true, user })
  }

  const now = new Date()

  const beforeState = {
    emailVerified: Boolean((user as any).emailVerified),
    emailVerifiedAt: (user as any).emailVerifiedAt ? new Date((user as any).emailVerifiedAt).toISOString() : null,
    emailVerifiedByAdminId: (user as any).emailVerifiedByAdminId ? String((user as any).emailVerifiedByAdminId) : null,
    role: String((user as any).role || 'USER'),
    status: String((user as any).status || 'ACTIVE'),
  }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { emailVerified: true, emailVerifiedAt: now, emailVerifiedByAdminId: auth.userId } as any,
    select: {
      id: true,
      email: true,
      emailVerified: true,
      emailVerifiedAt: true,
      emailVerifiedByAdminId: true,
      role: true,
      status: true,
    },
  })

  const afterState = {
    emailVerified: Boolean((updated as any).emailVerified),
    emailVerifiedAt: (updated as any).emailVerifiedAt ? new Date((updated as any).emailVerifiedAt).toISOString() : null,
    emailVerifiedByAdminId: (updated as any).emailVerifiedByAdminId ? String((updated as any).emailVerifiedByAdminId) : null,
    role: String((updated as any).role || 'USER'),
    status: String((updated as any).status || 'ACTIVE'),
  }

  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'USER_EMAIL_VERIFIED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: { actor: 'admin', actorAdminId: auth.userId, targetUserId: userId, targetEmail: String((user as any).email || '') },
  })

  return NextResponse.json({ success: true, user: updated })
}
