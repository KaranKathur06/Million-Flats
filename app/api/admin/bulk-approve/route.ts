import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { applyApprovalDefaults } from '@/lib/ecosystem/partnerVisibility'
import { checkProjectPublishReadiness } from '@/lib/publicationReadiness'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const bodySchema = z.object({
  entity: z.enum(['developers', 'agencies', 'ecosystem-partners', 'projects', 'properties']),
  ids: z.array(z.string().trim().min(1)).min(1).max(100),
})

function getIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid bulk approval request' }, { status: 400 })
  }

  const { entity } = parsed.data
  const ids = uniqueIds(parsed.data.ids)
  if (!ids.length) {
    return NextResponse.json({ success: false, message: 'No records selected' }, { status: 400 })
  }

  try {
    const success: string[] = []
    const failures: Array<{ id: string; message: string }> = []

    if (entity === 'developers') {
      const rows = await (prisma as any).developer.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, isDeleted: true },
      })
      const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]))
      for (const id of ids) {
        const row = byId.get(id)
        if (!row) failures.push({ id, message: 'Developer not found' })
        else if (row.isDeleted) failures.push({ id, message: 'Deleted developer cannot be published' })
        else if (!String(row.name || '').trim() || !String(row.slug || '').trim()) failures.push({ id, message: 'Developer name and slug are required' })
        else {
          await (prisma as any).developer.update({ where: { id }, data: { status: 'ACTIVE' } })
          success.push(id)
        }
      }
    }

    if (entity === 'agencies') {
      const existing = await (prisma as any).agencyProfile.findMany({ where: { id: { in: ids } }, select: { id: true } })
      const existingIds = new Set(existing.map((row: any) => row.id))
      const result = await (prisma as any).agencyProfile.updateMany({
        where: { id: { in: Array.from(existingIds) } },
        data: {
          onboardingStatus: 'APPROVED',
          verificationStatus: 'VERIFIED',
          isVerified: true,
          verifiedAt: new Date(),
          approvedBy: auth.userId,
          approvedAt: new Date(),
        },
      })
      success.push(...(Array.from(existingIds) as string[]).slice(0, result.count))
      for (const id of ids) if (!existingIds.has(id)) failures.push({ id, message: 'Agency not found' })
    }

    if (entity === 'ecosystem-partners') {
      const rows = await (prisma as any).ecosystemPartner.findMany({ where: { id: { in: ids } }, select: { id: true } })
      const existingIds = new Set(rows.map((row: any) => row.id))
      for (const id of ids) {
        if (!existingIds.has(id)) {
          failures.push({ id, message: 'Ecosystem partner not found' })
          continue
        }
        await (prisma as any).ecosystemPartner.update({
          where: { id },
          data: applyApprovalDefaults({ status: 'APPROVED' }),
        })
        success.push(id)
      }
    }

    if (entity === 'projects') {
      const rows = await (prisma as any).project.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, slug: true, developerId: true, isDeleted: true, status: true },
      })
      const byId = new Map<string, any>(rows.map((row: any) => [row.id, row]))
      for (const id of ids) {
        const row = byId.get(id)
        if (!row) failures.push({ id, message: 'Project not found' })
        else if (row.status === 'ARCHIVED') failures.push({ id, message: 'Archived project cannot be published' })
        else {
          const readiness = checkProjectPublishReadiness(row)
          if (!readiness.ok) failures.push({ id, message: readiness.message })
          else {
            await (prisma as any).project.update({ where: { id }, data: { status: 'PUBLISHED', archivedAt: null } })
            success.push(id)
          }
        }
      }
    }

    if (entity === 'properties') {
      for (const id of ids) {
        const result = await applyManualPropertyAdminAction({
          propertyId: id,
          action: 'publish',
          actorUserId: auth.userId,
          ipAddress: getIp(req),
        })
        if (result.ok) success.push(id)
        else failures.push({ id, message: result.message })
      }
    }

    revalidatePath('/developers')
    revalidatePath('/agencies')
    revalidatePath('/projects')
    revalidatePath('/buy')
    revalidatePath('/rent')
    revalidatePath('/properties')
    revalidatePath('/ecosystem-partners/[slug]', 'page')

    return NextResponse.json({
      success: true,
      entity,
      requested: ids.length,
      approved: success,
      updated: success.length,
      failures,
    })
  } catch (error) {
    console.error('[POST /api/admin/bulk-approve]', error)
    return NextResponse.json({ success: false, message: 'Bulk approval failed' }, { status: 500 })
  }
}