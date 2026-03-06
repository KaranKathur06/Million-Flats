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

const VALID_ROLES = ['USER', 'AGENT', 'MODERATOR', 'VERIFIER', 'ADMIN', 'SUPERADMIN'] as const
type ValidRole = (typeof VALID_ROLES)[number]

const ROLE_POWER: Record<ValidRole, number> = {
  USER: 1,
  AGENT: 2,
  MODERATOR: 3,
  VERIFIER: 4,
  ADMIN: 5,
  SUPERADMIN: 6,
}

function normalizeToValidRole(v: unknown): ValidRole | '' {
  const r = typeof v === 'string' ? v.trim().toUpperCase() : ''
  if (VALID_ROLES.includes(r as ValidRole)) return r as ValidRole
  return ''
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Require at least ADMIN to change roles
  const auth = await requireRole('ADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_USER_ROLE_CHANGED',
    windowMs: 60_000,
    max: 10,
  })
  if (!limit.ok) return bad('Too many requests', 429)

  const userId = String(params?.id || '').trim()
  if (!userId) return bad('Not found', 404)

  // Cannot change own role
  if (userId === auth.userId) {
    return bad('Cannot change your own role', 409)
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const nextRole = normalizeToValidRole(body?.role)
  if (!nextRole) return bad('Invalid role', 400)

  const actorRole = normalizeToValidRole(auth.role)
  if (!actorRole) return bad('Invalid actor role', 403)

  const actorPower = ROLE_POWER[actorRole]

  // PERMISSION RULE: Cannot promote to role >= own level (unless SUPERADMIN)
  if (actorRole !== 'SUPERADMIN' && ROLE_POWER[nextRole] >= actorPower) {
    return bad(`You cannot promote to ${nextRole} — insufficient privileges`, 403)
  }

  const user = await (prisma as any).user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  if (!user) return bad('Not found', 404)

  const prevRole = normalizeToValidRole(user.role)
  if (!prevRole) return bad('Target user has invalid role', 409)

  // Cannot modify users with higher or equal power (unless SUPERADMIN)
  if (actorRole !== 'SUPERADMIN' && ROLE_POWER[prevRole] >= actorPower) {
    return bad(`Cannot modify a user with role ${prevRole}`, 403)
  }

  if (prevRole === nextRole) {
    return bad('Role is already set to this value', 409)
  }

  // Prevent demoting the last SUPERADMIN
  if (prevRole === 'SUPERADMIN' && nextRole !== 'SUPERADMIN') {
    const superadminCount = await (prisma as any).user.count({ where: { role: 'SUPERADMIN' as any } })
    if (superadminCount <= 1) {
      return bad('Cannot demote the last SUPERADMIN', 409)
    }
  }

  const beforeState = { role: prevRole, status: String(user.status || 'ACTIVE') }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { role: nextRole } as any,
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  const afterState = { role: String(updated.role || nextRole).toUpperCase(), status: String(updated.status || 'ACTIVE') }

  await writeAuditLog({
    entityType: 'USER',
    entityId: userId,
    action: 'ADMIN_USER_ROLE_CHANGED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: {
      actor: 'admin',
      actorRole,
      previousRole: prevRole,
      nextRole,
      targetEmail: String(user.email || ''),
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
