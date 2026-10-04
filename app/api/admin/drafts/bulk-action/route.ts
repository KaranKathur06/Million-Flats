import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { hasMinRole } from '@/lib/rbac'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'
import { deleteManualPropertyDraft } from '@/lib/manualPropertyDraftDeletion'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'

const bodySchema = z.object({
  ids: z.array(z.string().trim().uuid()).min(1).max(500),
  action: z.enum(['PUBLISH', 'ARCHIVE', 'PERMANENT_DELETE']),
})

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (!hasMinRole(auth.role, 'ADMIN')) {
    return NextResponse.json({ success: false, message: 'You do not have permission to manage drafts' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid bulk draft action request' }, { status: 400 })
  }

  const ids = Array.from(new Set(parsed.data.ids))
  if (parsed.data.action === 'PERMANENT_DELETE') {
    const limit = await checkAdminRateLimit({
      performedByUserId: auth.userId,
      action: 'DRAFT_DELETED',
      windowMs: 60_000,
      max: 20,
    })
    if (!limit.ok) {
      return NextResponse.json({ success: false, message: 'Too many delete requests' }, { status: 429 })
    }
  }

  const successful: string[] = []
  const failed: Array<{ id: string; message: string }> = []
  const cleanupJobs: Array<{ id: string; propertyId: string }> = []

  for (const id of ids) {
    try {
      if (parsed.data.action === 'PERMANENT_DELETE') {
        const result = await deleteManualPropertyDraft({ propertyId: id, actorUserId: auth.userId, ipAddress: getIp(req) })
        if (!result.ok) failed.push({ id, message: result.message })
        else {
          successful.push(id)
          if (result.cleanupJobId) cleanupJobs.push({ id: result.cleanupJobId, propertyId: id })
        }
      } else {
        const result = await applyManualPropertyAdminAction({
          propertyId: id,
          action: parsed.data.action === 'PUBLISH' ? 'publish' : 'archive',
          actorUserId: auth.userId,
          ipAddress: getIp(req),
        })
        if (result.ok) successful.push(id)
        else failed.push({ id, message: result.message })
      }
    } catch (error) {
      console.error('[POST /api/admin/drafts/bulk-action] property failed', { id, error })
      failed.push({ id, message: 'Draft action failed' })
    }
  }

  if (cleanupJobs.length) {
    try {
      await processStorageCleanupJobs(cleanupJobs.length, cleanupJobs.map((job) => job.id))
    } catch (error) {
      console.error('[POST /api/admin/drafts/bulk-action] cleanup processing failed', error)
    }
  }

  let pendingCleanup = cleanupJobs.map((job) => job.propertyId)
  if (cleanupJobs.length) {
    try {
      const jobs = await (prisma as any).storageCleanupJob.findMany({
        where: { id: { in: cleanupJobs.map((job) => job.id) }, status: { not: 'COMPLETED' } },
        select: { id: true },
      })
      const pendingJobIds = new Set(jobs.map((job: { id: string }) => job.id))
      pendingCleanup = cleanupJobs.filter((job) => pendingJobIds.has(job.id)).map((job) => job.propertyId)
    } catch (error) {
      console.error('[POST /api/admin/drafts/bulk-action] cleanup status lookup failed', error)
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    partial: successful.length > 0 && failed.length > 0,
    action: parsed.data.action,
    requested: ids.length,
    successful,
    failed,
    pendingCleanup,
  }, { status: successful.length > 0 || failed.length === 0 ? 200 : 422 })
}