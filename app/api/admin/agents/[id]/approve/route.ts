import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { approveAgent } from '@/lib/services/agentGovernance.service'

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

  const isSuperadmin = String(auth.role || '').toUpperCase() === 'SUPERADMIN'

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_AGENT_APPROVED',
    windowMs: 60_000,
    max: 20,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const agentId = String(params?.id || '').trim()
  if (!agentId) return bad('Not found', 404)

  const result = await approveAgent({
    agentId,
    actorUserId: auth.userId,
    actorRole: auth.role,
    allowDraftOverride: isSuperadmin,
  })

  if (!result.ok) {
    return bad(result.message, result.status)
  }

  await writeAuditLog({
    entityType: 'AGENT',
    entityId: agentId,
    action: result.wasOverride ? 'AGENT_APPROVED_OVERRIDE' : 'AGENT_APPROVED',
    performedByUserId: auth.userId,
    ipAddress: getIp(req),
    beforeState: result.beforeState,
    afterState: result.afterState,
    meta: {
      actorUserId: auth.userId,
      actorRole: auth.role,
      agentId,
      previousStatus: String(result.beforeState?.profileStatus || ''),
      newStatus: String(result.afterState?.profileStatus || ''),
      wasOverride: result.wasOverride,
      ip: getIp(req),
      previousApproved: Boolean((result.beforeState as any)?.approved),
    },
  })

  return NextResponse.json({ success: true, agent: result.agent })
}
