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
    action: 'ADMIN_AGENT_BANNED',
    windowMs: 60_000,
    max: 10,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const agentId = String(params?.id || '').trim()
  if (!agentId) return bad('Not found', 404)

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const agentRows = await tx.$queryRawUnsafe(
      'SELECT "id", "user_id" FROM "agents" WHERE "id" = $1 FOR UPDATE',
      agentId,
    )
    if (!agentRows.length) return { ok: false as const, status: 404, message: 'Not found' }
    await tx.$queryRawUnsafe(
      'SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE',
      agentRows[0].user_id,
    )
    const agent = await tx.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        approved: true,
        userId: true,
        user: { select: { role: true, status: true, securityStateVersion: true } },
      },
    })
    if (!agent) return { ok: false as const, status: 404, message: 'Not found' }

    const targetRole = String(agent.user.role || '').toUpperCase()
    if (targetRole === 'ADMIN' || targetRole === 'SUPERADMIN') {
      return { ok: false as const, status: 403, message: 'Forbidden' }
    }

    const updated = await tx.agent.update({
      where: { id: agentId },
      data: { approved: false },
      select: { id: true, approved: true },
    })
    const updatedUser = await tx.user.update({
      where: { id: agent.userId },
      data: { status: 'BANNED', securityStateVersion: { increment: 1 } },
      select: { status: true, securityStateVersion: true },
    })
    await tx.manualProperty.updateMany({
      where: { agentId, sourceType: 'MANUAL', status: 'PUBLISHED' },
      data: { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: auth.userId },
    })
    await tx.auditLog.create({
      data: {
        entityType: 'AGENT',
        entityId: agentId,
        action: 'ADMIN_AGENT_BANNED',
        performedByUserId: auth.userId,
        ipAddress: getIp(req),
        beforeState: {
          approved: agent.approved,
          userStatus: agent.user.status,
          securityStateVersion: agent.user.securityStateVersion,
        },
        afterState: {
          approved: updated.approved,
          userStatus: updatedUser.status,
          securityStateVersion: updatedUser.securityStateVersion,
        },
        meta: { actor: 'admin' },
      },
    })
    return { ok: true as const, agent: updated }
  }, { isolationLevel: 'Serializable' })

  if (!result.ok) return bad(result.message, result.status)
  return NextResponse.json({ success: true, agent: result.agent })
}
