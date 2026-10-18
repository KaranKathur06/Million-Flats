import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbacServer'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { restoreAgent } from '@/lib/agentAdminLifecycle'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole('ADMIN')
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  let limit
  try {
    limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'ADMIN_RESTORED',
      windowMs: 60_000,
      max: 20,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Rate-limit service unavailable' }, { status: 503 })
  }
  if (!limit.ok) {
    return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 })
  }

  const result = await restoreAgent(params?.id, auth.userId)
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status })
  }
  return NextResponse.json({
    success: true,
    ...result,
    message: result.partial
      ? 'Restore was partial. Later account-security changes were preserved; admin review is required.'
      : 'Agent restored',
  })
}
