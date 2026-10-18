import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbacServer'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { permanentlyDeleteAgent } from '@/lib/agentAdminLifecycle'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('SUPERADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid confirmation request' }, { status: 400 })
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !('confirmation' in body) ||
    body.confirmation !== 'PERMANENTLY_DELETE_AGENT'
  ) {
    return NextResponse.json({ success: false, message: 'Permanent deletion confirmation is required' }, { status: 400 })
  }

  let limit
  try {
    limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'ADMIN_AGENT_DELETED',
      windowMs: 60_000,
      max: 5,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Rate-limit service unavailable' }, { status: 503 })
  }
  if (!limit.ok) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 })
  }

  const result = await permanentlyDeleteAgent(params?.id, auth.userId)
  if (!result.ok) {
    return NextResponse.json({
      success: false,
      message: result.message,
      dependencies: result.dependencies,
    }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    agentId: result.agentId,
    cleanup: result.cleanupJobId ? { status: 'PENDING', jobId: result.cleanupJobId } : { status: 'NOT_REQUIRED' },
    message: result.cleanupJobId
      ? 'Agent deleted; private document cleanup is pending'
      : 'Agent deleted',
  })
}
