import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const existing = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, isDeleted: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    if (!existing.isDeleted) {
      return NextResponse.json({ success: true, message: 'Project is already active' })
    }

    const updated = await (prisma as any).project.update({
      where: { id: params.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
      select: { id: true, slug: true, isDeleted: true },
    })

    await writeAuditLog({
      entityType: 'PROJECT',
      entityId: params.id,
      action: 'PROJECT_RESTORED',
      performedByUserId: auth.userId,
      beforeState: { isDeleted: true },
      afterState: { isDeleted: false },
      meta: { mode: 'restore' },
    })

    revalidatePath('/')
    revalidatePath('/projects')
    revalidatePath('/admin/projects')
    if (existing.slug) revalidatePath(`/projects/${existing.slug}`)

    return NextResponse.json({ success: true, project: updated })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/[id]/restore]', err)
    return NextResponse.json({ success: false, message: 'Failed to restore project' }, { status: 500 })
  }
}
