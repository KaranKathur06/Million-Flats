import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { audit } from '@/lib/services/audit.service'
import { decideModerationCase } from '@/lib/services/caseDecision.service'

function bad(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'ADMIN_MODERATION_CASE_APPROVE',
    windowMs: 60_000,
    max: 60,
  })
  if (!limit.ok) return bad('Too many requests', 429)

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const result = await decideModerationCase({
    caseId: id,
    actorUserId: auth.userId,
    actorRole: auth.role,
    decision: 'APPROVED',
    note: null,
  })

  if (!result.ok) return bad(result.message, result.status)

  await audit({
    entityType: result.entityType as any,
    entityId: String(result.entityId || ''),
    action: 'ADMIN_APPROVED',
    performedByUserId: auth.userId,
    req,
    meta: { decision: 'APPROVED', caseId: id },
  })

  return NextResponse.json({ success: true, case: result.case })
}
