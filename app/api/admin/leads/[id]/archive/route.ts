import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { LeadLifecycleConflictError, setLeadArchived } from '@/lib/leads/adminLifecycle'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!['ADMIN', 'SUPERADMIN'].includes(String(auth.role).toUpperCase())) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'LEAD_ARCHIVED',
      windowMs: 60_000,
      max: 60,
    })
    if (!limit.ok) return NextResponse.json({ success: false, message: 'Too many requests.' }, { status: 429 })
  } catch (error) {
    console.error('[admin/leads/archive] Rate-limit check failed', { leadId: params.id, error })
    return NextResponse.json({ success: false, message: 'Unable to verify request limit.' }, { status: 503 })
  }

  try {
    const result = await setLeadArchived({ leadId: params.id, actorId: auth.userId, archived: true })
    if (result.kind === 'not-found') return NextResponse.json({ success: false, message: 'Lead not found.' }, { status: 404 })
    return NextResponse.json({ success: true, archived: true, deletedAt: result.deletedAt })
  } catch (error) {
    if (error instanceof LeadLifecycleConflictError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 })
    }
    console.error('[admin/leads/archive] Failed to archive lead', { leadId: params.id, error })
    return NextResponse.json({ success: false, message: 'Unable to archive lead.' }, { status: 500 })
  }
}
