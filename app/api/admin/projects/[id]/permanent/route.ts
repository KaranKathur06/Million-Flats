import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { validatePermanentDeleteConfirmation } from '@/lib/projectPermanentDelete'
import { permanentlyDeleteProject } from '@/lib/projectPermanentDeleteService'
import { processStorageCleanupJobs } from '@/lib/storageCleanup'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  if (auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden - superadmin only' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const confirmationValidation = validatePermanentDeleteConfirmation(body?.confirmation)
    if (!confirmationValidation.ok) {
      return NextResponse.json({ success: false, message: confirmationValidation.message }, { status: 400 })
    }

    const limit = await checkAdminRateLimit({ performedByUserId: auth.userId, action: 'PROJECT_HARD_DELETED', windowMs: 60_000, max: 10 })
    if (!limit.ok) return NextResponse.json({ success: false, message: 'Too many permanent-delete requests' }, { status: 429 })

    const result = await permanentlyDeleteProject(params.id, auth.userId)
    if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: result.status })

    if (result.cleanupJobId) {
      try {
        await processStorageCleanupJobs(1, [result.cleanupJobId])
      } catch (error) {
        console.error('[DELETE /api/admin/projects/[id]/permanent] cleanup processing failed', error)
      }
    }

    let cleanupPending = Boolean(result.cleanupJobId)
    if (result.cleanupJobId) {
      try {
        cleanupPending = await (prisma as any).storageCleanupJob.count({
          where: { id: result.cleanupJobId, status: { not: 'COMPLETED' } },
        }) > 0
      } catch (error) {
        console.error('[DELETE /api/admin/projects/[id]/permanent] cleanup status lookup failed', error)
      }
    }

    return NextResponse.json({ success: true, mode: 'hard', cleanupPending })
  } catch (err: any) {
    console.error('[DELETE /api/admin/projects/[id]/permanent]', err)
    return NextResponse.json({ success: false, message: 'Permanent delete failed' }, { status: 500 })
  }
}
