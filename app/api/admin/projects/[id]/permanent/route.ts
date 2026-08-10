import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { deleteFolderFromS3, deleteFromS3 } from '@/lib/s3'
import { collectProjectOwnedS3Keys, getPermanentDeleteStatus, validatePermanentDeleteConfirmation } from '@/lib/projectPermanentDelete'

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

    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isDeleted: true,
        deletedAt: true,
        developer: { select: { slug: true } },
        media: { select: { s3Key: true, mediaUrl: true } },
        floorPlans: { select: { s3Key: true, imageUrl: true } },
        brochure: { select: { s3Key: true, fileUrl: true } },
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    const deleteGuard = getPermanentDeleteStatus(project)
    if (!deleteGuard.ok) {
      return NextResponse.json({ success: false, message: deleteGuard.reason }, { status: 409 })
    }

    const developerSlug = String(project.developer?.slug || '').trim().toLowerCase()
    const projectSlug = String(project.slug || '').trim().toLowerCase()
    const ownedS3Keys = collectProjectOwnedS3Keys(project)

    if (developerSlug && projectSlug) {
      const prefix = `public/projects/${developerSlug}/${projectSlug}`
      await deleteFolderFromS3(prefix)
    }

    for (const key of ownedS3Keys) {
      try {
         await deleteFromS3(key)
      } catch (error) {
        console.warn('[permanent project delete] S3 object cleanup skipped', { key, error })
      }
    }

    await (prisma as any).project.delete({ where: { id: params.id } })

    await writeAuditLog({
      entityType: 'PROJECT',
      entityId: params.id,
      action: 'PROJECT_HARD_DELETED',
      performedByUserId: auth.userId,
      beforeState: { name: project.name, slug: project.slug, status: project.status, isDeleted: project.isDeleted, deletedAt: project.deletedAt },
      afterState: null,
      meta: {
        mode: 'hard',
        s3Prefix: developerSlug && projectSlug ? `public/projects/${developerSlug}/${projectSlug}/` : null,
        ownedS3Keys,
      },
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
