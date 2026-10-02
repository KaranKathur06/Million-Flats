import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { validatePermanentDeleteConfirmation } from '@/lib/projectPermanentDelete'
import { permanentlyDeleteProject } from '@/lib/projectPermanentDeleteService'
import { prisma } from '@/lib/prisma'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'

const bodySchema = z.object({
  ids: z.array(z.string().trim().uuid()).min(1).max(100),
  confirmation: z.string(),
})

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }
  if (auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden - superadmin only' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid bulk permanent-delete request' }, { status: 400 })
  }
  const confirmation = validatePermanentDeleteConfirmation(parsed.data.confirmation)
  if (!confirmation.ok) {
    return NextResponse.json({ success: false, message: confirmation.message }, { status: 400 })
  }

  const limit = await checkAdminRateLimit({ performedByUserId: auth.userId, action: 'PROJECT_HARD_DELETED', windowMs: 60_000, max: 10 })
  if (!limit.ok) {
    return NextResponse.json({ success: false, message: 'Too many permanent-delete requests' }, { status: 429 })
  }

  const ids = Array.from(new Set(parsed.data.ids))
  const successful: string[] = []
  const failed: Array<{ id: string; message: string }> = []
  const cleanupJobs: Array<{ id: string; projectId: string }> = []

  for (const id of ids) {
    try {
      const result = await permanentlyDeleteProject(id, auth.userId)
      if (!result.ok) failed.push({ id, message: result.message })
      else {
        successful.push(id)
        if (result.cleanupJobId) cleanupJobs.push({ id: result.cleanupJobId, projectId: id })
      }
    } catch (error) {
      console.error('[POST /api/admin/projects/bulk-permanent-delete] project failed', { id, error })
      failed.push({ id, message: 'Project permanent delete failed' })
    }
  }

  if (cleanupJobs.length) {
    try {
      await processStorageCleanupJobs(cleanupJobs.length, cleanupJobs.map((job) => job.id))
    } catch (error) {
      console.error('[POST /api/admin/projects/bulk-permanent-delete] cleanup processing failed', error)
    }
  }

  let pendingCleanup = cleanupJobs.map((job) => job.projectId)
  if (cleanupJobs.length) {
    try {
      const jobs = await (prisma as any).storageCleanupJob.findMany({
        where: { id: { in: cleanupJobs.map((job) => job.id) }, status: { not: 'COMPLETED' } },
        select: { id: true },
      })
      const pendingIds = new Set(jobs.map((job: { id: string }) => job.id))
      pendingCleanup = cleanupJobs.filter((job) => pendingIds.has(job.id)).map((job) => job.projectId)
    } catch (error) {
      console.error('[POST /api/admin/projects/bulk-permanent-delete] cleanup status lookup failed', error)
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    partial: successful.length > 0 && failed.length > 0,
    requested: ids.length,
    successful,
    failed,
    pendingCleanup,
  }, { status: successful.length > 0 || failed.length === 0 ? 200 : 422 })
}