import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { hasMinRole } from '@/lib/rbac'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const bodySchema = z.object({
  ids: z.array(z.string().trim().uuid()).min(1).max(500),
  action: z.enum(['PUBLISH', 'REJECT', 'ARCHIVE', 'UNPUBLISH', 'SOLD', 'RESTORE']),
  reason: z.string().trim().max(1000).optional(),
})

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

const actionMap = {
  PUBLISH: 'publish',
  REJECT: 'reject',
  ARCHIVE: 'archive',
  UNPUBLISH: 'unpublish',
  SOLD: 'mark_sold',
  RESTORE: 'restore',
} as const

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!hasMinRole(auth.role, 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'You do not have permission to manage properties' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      message: 'Invalid bulk property action request',
      errors: parsed.error.flatten().fieldErrors,
    }, { status: 400 })
  }

  const ids = Array.from(new Set(parsed.data.ids))
  const lifecycleAction = actionMap[parsed.data.action]
  const successful: string[] = []
  const failed: Array<{ id: string; message: string }> = []

  for (const id of ids) {
    try {
      const result = await applyManualPropertyAdminAction({
        propertyId: id,
        action: lifecycleAction,
        actorUserId: auth.userId,
        ipAddress: getIp(req),
        reason: parsed.data.reason || null,
      })
      if (result.ok) successful.push(id)
      else failed.push({ id, message: result.message })
    } catch (error) {
      console.error('[POST /api/admin/properties/bulk-action] property failed', { id, error })
      failed.push({ id, message: 'Property action failed' })
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    partial: successful.length > 0 && failed.length > 0,
    action: parsed.data.action,
    requested: ids.length,
    successful,
    failed,
  }, { status: successful.length > 0 || failed.length === 0 ? 200 : 422 })
}