import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { collectProjectOwnedS3Keys, getPermanentDeleteStatus } from '@/lib/projectPermanentDelete'

export async function permanentlyDeleteProject(projectId: string, actorUserId: string) {
  const id = String(projectId || '').trim()
  if (!id) return { ok: false as const, status: 404, message: 'Project not found' }

  const result = await (prisma as any).$transaction(async (tx: any) => {
    const project = await tx.project.findUnique({
      where: { id },
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

    if (!project) return { ok: false as const, status: 404, message: 'Project not found' }

    const guard = getPermanentDeleteStatus(project)
    if (!guard.ok) return { ok: false as const, status: 409, message: guard.reason }

    const developerSlug = String(project.developer?.slug || '').trim().toLowerCase()
    const projectSlug = String(project.slug || '').trim().toLowerCase()
    const folderPrefix = developerSlug && projectSlug
      ? `public/projects/${developerSlug}/${projectSlug}`
      : null
    const cleanupItems = [
      ...collectProjectOwnedS3Keys(project).map((key) => ({ type: 'key', key })),
      ...(folderPrefix ? [{ type: 'folder', prefix: folderPrefix }] : []),
    ]
    const cleanupJob = cleanupItems.length
      ? await tx.storageCleanupJob.create({ data: { storageItems: cleanupItems } })
      : null

    await tx.auditLog.create({
      data: {
        entityType: 'PROJECT',
        entityId: id,
        action: 'PROJECT_HARD_DELETED',
        performedByUserId: actorUserId,
        beforeState: {
          name: project.name,
          slug: project.slug,
          status: project.status,
          isDeleted: project.isDeleted,
          deletedAt: project.deletedAt,
        },
        afterState: null,
        meta: { mode: 'hard', cleanupJobId: cleanupJob?.id || null, cleanupItems },
      },
    })

    const deletion = await tx.project.deleteMany({ where: { id, isDeleted: true } })
    if (deletion.count !== 1) throw new Error('Project must remain soft-deleted until permanent deletion commits.')

    return {
      ok: true as const,
      project: { id, slug: project.slug },
      cleanupJobId: cleanupJob?.id || null,
    }
  })

  if (result.ok) {
    revalidatePath('/')
    revalidatePath('/projects')
    revalidatePath('/admin/projects')
    if (result.project.slug) revalidatePath(`/projects/${result.project.slug}`)
  }

  return result
}