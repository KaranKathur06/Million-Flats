import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { hasMinRole } from '@/lib/rbac'
import { deleteManualPropertyDraft } from '@/lib/manualPropertyDraftDeletion'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
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
  if (!hasMinRole(auth.role, 'ADMIN')) {
    return bad('You do not have permission to manage drafts', 403)
  }

  const limit = await checkAdminRateLimit({
    performedByUserId: auth.userId,
    action: 'DRAFT_DELETED',
    windowMs: 60_000,
    max: 20,
  })
  if (!limit.ok) {
    return bad('Too many requests', 429)
  }

  const id = String(params?.id || '').trim()
  if (!id) return bad('Not found', 404)

  const result = await deleteManualPropertyDraft({ propertyId: id, actorUserId: auth.userId, ipAddress: getIp(req) })
  if (!result.ok) return bad(result.message, result.status)

  if (result.cleanupJobId) {
    try {
      await processStorageCleanupJobs(1, [result.cleanupJobId])
    } catch (error) {
      console.error('[POST /api/admin/drafts/[id]/delete] cleanup processing failed', error)
    }
  }

  let cleanupPending = Boolean(result.cleanupJobId)
  if (result.cleanupJobId) {
    try {
      cleanupPending = await (prisma as any).storageCleanupJob.count({
        where: { id: result.cleanupJobId, status: { not: 'COMPLETED' } },
      }) > 0
    } catch (error) {
      console.error('[POST /api/admin/drafts/[id]/delete] cleanup status lookup failed', error)
    }
  }

  return NextResponse.json({ success: true, cleanupPending })
}
