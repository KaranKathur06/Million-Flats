import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function normalizeRole(v: unknown): 'USER' | 'ADMIN' | 'SUPERADMIN' | '' {
  const r = typeof v === 'string' ? v.trim().toUpperCase() : ''
  if (r === 'USER' || r === 'ADMIN' || r === 'SUPERADMIN') return r
  return ''
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('SUPERADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const userId = String(params?.id || '').trim()
  if (!userId) return bad('Not found', 404)

  if (userId === auth.userId) {
    return bad('Cannot change your own role', 409)
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    body = null
  }

  const nextRole = normalizeRole(body?.role)
  if (!nextRole) {
    return bad('Invalid role', 400)
  }

  const user = await (prisma as any).user.findFirst({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  if (!user) return bad('Not found', 404)

  const prevRole = String((user as any).role || 'USER').toUpperCase()
  if (prevRole !== 'USER' && prevRole !== 'ADMIN' && prevRole !== 'SUPERADMIN') {
    return bad('Conflict', 409)
  }

  if (prevRole === nextRole) {
    return bad('Conflict', 409)
  }

  if (prevRole === 'SUPERADMIN' && nextRole !== 'SUPERADMIN') {
    const superadminCount = await (prisma as any).user.count({ where: { role: 'SUPERADMIN' as any } })
    if (superadminCount <= 1) {
      return bad('Cannot demote the last SUPERADMIN', 409)
    }
  }

  const beforeState = { role: prevRole, status: String((user as any).status || 'ACTIVE') }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data: { role: nextRole } as any,
    select: { id: true, email: true, role: true, status: true, verified: true },
  })

  const afterState = { role: String((updated as any).role || nextRole).toUpperCase(), status: String((updated as any).status || 'ACTIVE') }

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
      previousRole: prevRole,
      nextRole,
      targetEmail: String((user as any).email || ''),
    },
  })

  return NextResponse.json({ success: true, user: updated })
}
