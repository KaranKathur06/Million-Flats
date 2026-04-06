import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { deleteFolderFromS3 } from '@/lib/s3'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  if (auth.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, message: 'Forbidden - superadmin only' }, { status: 403 })
  }

  try {
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isDeleted: true,
        developer: { select: { slug: true } },
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    const developerSlug = String(project.developer?.slug || '').trim().toLowerCase()
    const projectSlug = String(project.slug || '').trim().toLowerCase()
    if (developerSlug && projectSlug) {
      const prefix = `public/projects/${developerSlug}/${projectSlug}`
      await deleteFolderFromS3(prefix)
    }

    await (prisma as any).project.delete({ where: { id: params.id } })

    await writeAuditLog({
      entityType: 'PROJECT',
      entityId: params.id,
      action: 'PROJECT_HARD_DELETED',
      performedByUserId: auth.userId,
      beforeState: { name: project.name, slug: project.slug, status: project.status, isDeleted: project.isDeleted },
      afterState: null,
      meta: { mode: 'hard', s3Prefix: developerSlug && projectSlug ? `public/projects/${developerSlug}/${projectSlug}/` : null },
    })

    revalidatePath('/')
    revalidatePath('/projects')
    revalidatePath('/admin/projects')
    if (project.slug) revalidatePath(`/projects/${project.slug}`)

    return NextResponse.json({ success: true, mode: 'hard' })
  } catch (err: any) {
    console.error('[DELETE /api/admin/projects/[id]/permanent]', err)
    return NextResponse.json({ success: false, message: 'Permanent delete failed' }, { status: 500 })
  }
}
