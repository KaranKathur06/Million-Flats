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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('SUPERADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const agentId = String(params?.id || '').trim()
  if (!agentId) return bad('Not found', 404)

  const agent = await (prisma as any).agent.findFirst({
    where: { id: agentId },
    select: { id: true, approved: true, userId: true, user: { select: { role: true, status: true } } },
  })

  if (!agent) return bad('Not found', 404)

  const targetRole = String(agent?.user?.role || '').toUpperCase()
  if (targetRole === 'ADMIN' || targetRole === 'SUPERADMIN') {
    return bad('Forbidden', 403)
  }

  const beforeState = {
    approved: Boolean(agent.approved),
    userRole: String(agent?.user?.role || 'AGENT'),
    userStatus: String(agent?.user?.status || 'ACTIVE'),
  }

  const updated = await (prisma as any).agent.update({
    where: { id: agentId },
    data: { approved: false, user: { update: { role: 'USER', status: 'ACTIVE' } } } as any,
    select: { id: true, approved: true },
  })

  const afterState = { approved: Boolean(updated.approved), userRole: 'USER', userStatus: 'ACTIVE' }

  await (prisma as any).manualProperty
    .updateMany({
      where: { agentId, sourceType: 'MANUAL', status: 'APPROVED' },
      data: { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: auth.userId } as any,
    })
    .catch(() => null)

  await writeAuditLog({
    entityType: 'AGENT',
    entityId: agentId,
    action: 'ADMIN_AGENT_ROLE_REVOKED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: {
      actor: 'admin',
      previousRole: String(agent?.user?.role || 'AGENT'),
      previousStatus: String(agent?.user?.status || 'ACTIVE'),
      previousApproved: Boolean(agent.approved),
    },
  })

  return NextResponse.json({ success: true, agent: updated })
}
