import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

type Body = { projectIds?: unknown }

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const ids = input.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
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
  if (!projectIds.length) {
    return NextResponse.json({ success: false, message: 'No projectIds provided' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, slug: true, isDeleted: true, status: true },
    })
    const byId = new Map(existing.map((p: any) => [p.id, p]))
    const success: string[] = []
    const failed: string[] = []

    for (const id of projectIds) {
      const p = byId.get(id)
      if (!p || p.isDeleted) {
        failed.push(id)
        continue
      }
      try {
        await (prisma as any).project.update({
          where: { id },
          data: { status: 'ARCHIVED', archivedAt: new Date(), isFeatured: false, featuredOrder: null },
        })
        await writeAuditLog({
          entityType: 'PROJECT',
          entityId: id,
          action: 'PROJECT_ARCHIVED',
          performedByUserId: auth.userId,
          beforeState: { status: p.status },
          afterState: { status: 'ARCHIVED' },
          meta: { mode: 'bulk-archive' },
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

    return NextResponse.json({ success: true, result: { success, failed } })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/bulk-archive]', err)
    return NextResponse.json({ success: false, message: 'Bulk archive failed' }, { status: 500 })
  }
}
