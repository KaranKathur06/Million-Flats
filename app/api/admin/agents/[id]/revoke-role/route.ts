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

  const agentId = String(params?.id || '').trim()
  if (!agentId) return bad('Not found', 404)

  const agent = await (prisma as any).agent.findFirst({
    where: { id: agentId },
    select: { id: true, approved: true, userId: true, user: { select: { role: true, status: true } } },
  })

  if (!agent) return bad('Not found', 404)

  const updated = await (prisma as any).agent.update({
    where: { id: agentId },
    data: { approved: false, user: { update: { role: 'USER', status: 'ACTIVE' } } } as any,
    select: { id: true, approved: true },
  })

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
    meta: {
      actor: 'admin',
      previousRole: String(agent?.user?.role || 'AGENT'),
      previousStatus: String(agent?.user?.status || 'ACTIVE'),
      previousApproved: Boolean(agent.approved),
    },
  })

  return NextResponse.json({ success: true, agent: updated })
}
