import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

type Body = {
  projectIds?: unknown
}

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const ids = input
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean)
  return Array.from(new Set(ids))
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 })
  }

  const projectIds = normalizeIds(body.projectIds)
  if (projectIds.length === 0) {
    return NextResponse.json({ success: false, message: 'No projectIds provided' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, slug: true, isDeleted: true, status: true, isFeatured: true },
    })

    const byId = new Map(existing.map((p: any) => [p.id, p]))
    const success: string[] = []
    const failed: string[] = []

    for (const id of projectIds) {
      const project = byId.get(id)
      if (!project || project.isDeleted) {
        failed.push(id)
        continue
      }

      try {
        await (prisma as any).project.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: auth.userId,
            isFeatured: false,
            featuredOrder: null,
          },
        })

        await writeAuditLog({
          entityType: 'PROJECT',
          entityId: id,
          action: 'PROJECT_SOFT_DELETED',
          performedByUserId: auth.userId,
          beforeState: { isDeleted: false, status: project.status, isFeatured: project.isFeatured },
          afterState: { isDeleted: true, isFeatured: false },
          meta: { mode: 'bulk-soft-delete' },
        })

        success.push(id)
      } catch {
        failed.push(id)
      }
    }

    revalidatePath('/')
    revalidatePath('/projects')
    revalidatePath('/admin/projects')

    for (const p of existing) {
      if (p.slug) revalidatePath(`/projects/${p.slug}`)
    }

    return NextResponse.json({
      success: true,
      result: { success, failed },
      deletedCount: success.length,
      failedCount: failed.length,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/bulk-delete]', err)
    return NextResponse.json({ success: false, message: 'Bulk delete failed' }, { status: 500 })
  }
}
