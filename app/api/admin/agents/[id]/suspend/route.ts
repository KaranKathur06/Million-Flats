import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
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
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_AGENT_SUSPENDED',
    windowMs: 60_000,
    max: 20,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const agentId = String(params?.id || '').trim()
  if (!agentId) return bad('Not found', 404)

  const agent = await (prisma as any).agent.findFirst({
    where: { id: agentId },
    select: { id: true, approved: true, userId: true, user: { select: { status: true } } },
  })

  if (!agent) return bad('Not found', 404)

  const beforeState = { approved: Boolean(agent.approved), userStatus: String(agent?.user?.status || 'ACTIVE') }

  const updated = await (prisma as any).agent.update({
    where: { id: agentId },
    data: { approved: false, user: { update: { status: 'SUSPENDED' } } } as any,
    select: { id: true, approved: true },
  })

  const afterState = { approved: Boolean(updated.approved), userStatus: 'SUSPENDED' }

  await writeAuditLog({
    entityType: 'AGENT',
    entityId: agentId,
    action: 'ADMIN_AGENT_SUSPENDED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState,
    afterState,
    meta: { actor: 'admin', previousApproved: Boolean(agent.approved) },
  })

  return NextResponse.json({ success: true, agent: updated })
}
