import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { deleteFromS3 } from '@/lib/s3'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function forbidden(message = 'Forbidden', status = 403) {
  return NextResponse.json({ success: false, message }, { status })
}

function hasLeadMagnetClient() {
  return Boolean((prisma as any)?.leadMagnet)
}

function toInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function deriveLeadMagnetStatus(item: { fileS3Key?: string | null; isActive?: boolean; popupEnabled?: boolean }) {
  if (!String(item.fileS3Key || '').trim()) return 'draft' as const
  if (Boolean(item.isActive)) return 'active' as const
  if (Boolean(item.popupEnabled)) return 'published' as const
  return 'uploaded' as const
}

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)
  if (!session?.user) return { ok: false as const, response: forbidden('Unauthorized', 401) }
  if (!hasMinRole(role, 'ADMIN')) return { ok: false as const, response: forbidden() }
  return { ok: true as const, session }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await assertAdmin()
  if (!access.ok) return access.response

  if (!hasLeadMagnetClient()) {
    return NextResponse.json(
      { success: false, message: 'Lead magnet models are not available yet. Run prisma generate on the deployment host.' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => null)
  const id = String(params.id || '').trim()
  if (!id) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 })

  const nextSlug = body?.slug !== undefined ? String(body.slug).trim().toLowerCase() : undefined
  const nextFileS3Key = body?.fileS3Key !== undefined ? (String(body.fileS3Key).trim() || null) : undefined

  if (nextFileS3Key !== undefined && nextFileS3Key !== null && !nextFileS3Key.startsWith('private/')) {
    return NextResponse.json({ success: false, message: 'fileS3Key must be a private S3 key' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).leadMagnet.findUnique({
      where: { id },
      select: { id: true, slug: true, fileS3Key: true, isActive: true, popupEnabled: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Lead magnet not found' }, { status: 404 })
    }

    if (nextSlug) {
      const slugOwner = await (prisma as any).leadMagnet.findUnique({ where: { slug: nextSlug }, select: { id: true } })
      if (slugOwner && String(slugOwner.id) !== id) {
        return NextResponse.json(
          { success: false, message: 'Slug already exists. Use a new slug or update the existing lead magnet.' },
          { status: 409 }
        )
      }
    }

    const finalFileKey = nextFileS3Key !== undefined ? nextFileS3Key : existing.fileS3Key
    const nextIsActive = body?.isActive !== undefined ? Boolean(body.isActive) : Boolean(existing.isActive)
    const nextPopupEnabled = body?.popupEnabled !== undefined ? Boolean(body.popupEnabled) : Boolean(existing.popupEnabled)

    if (nextIsActive && !finalFileKey) {
      return NextResponse.json({ success: false, message: 'Cannot activate a lead magnet without an uploaded PDF' }, { status: 400 })
    }
    if (nextPopupEnabled && !finalFileKey) {
      return NextResponse.json({ success: false, message: 'Cannot publish a lead magnet without an uploaded PDF' }, { status: 400 })
    }

    const updated = await (prisma as any).leadMagnet.update({
      where: { id },
      data: {
        slug: nextSlug,
        title: body?.title !== undefined ? String(body.title).trim() : undefined,
        subtitle: body?.subtitle !== undefined ? (String(body.subtitle).trim() || null) : undefined,
        ctaLabel: body?.ctaLabel !== undefined ? String(body.ctaLabel).trim() : undefined,
        loginHint: body?.loginHint !== undefined ? String(body.loginHint).trim() : undefined,
        badgeText: body?.badgeText !== undefined ? (String(body.badgeText).trim() || null) : undefined,
        fileS3Key: nextFileS3Key,
        isActive: body?.isActive !== undefined ? nextIsActive : undefined,
        popupEnabled: body?.popupEnabled !== undefined ? nextPopupEnabled : undefined,
        popupDelaySeconds: body?.popupDelaySeconds !== undefined ? toInt(body.popupDelaySeconds, 4, 1, 30) : undefined,
        popupScrollPercent: body?.popupScrollPercent !== undefined ? toInt(body.popupScrollPercent, 25, 5, 80) : undefined,
        cooldownHours: body?.cooldownHours !== undefined ? toInt(body.cooldownHours, 24, 1, 168) : undefined,
        sortOrder: body?.sortOrder !== undefined ? toInt(body.sortOrder, 0, -9999, 9999) : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        status: deriveLeadMagnetStatus(updated),
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Slug already exists. Use a new slug or update the existing lead magnet.' },
        { status: 409 }
      )
    }
    console.error('[PATCH /api/admin/lead-magnets/[id]] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to update lead magnet' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertAdmin()
  if (!access.ok) return access.response

  if (!hasLeadMagnetClient()) {
    return NextResponse.json(
      { success: false, message: 'Lead magnet models are not available yet. Run prisma generate on the deployment host.' },
      { status: 503 }
    )
  }

  const id = String(params.id || '').trim()
  if (!id) return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 })

  try {
    const existing = await (prisma as any).leadMagnet.findUnique({
      where: { id },
      select: { id: true, fileS3Key: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Lead magnet not found' }, { status: 404 })
    }

    await (prisma as any).leadMagnet.delete({ where: { id } })

    if (existing.fileS3Key) {
      await deleteFromS3(String(existing.fileS3Key)).catch((error) => {
        console.error('[DELETE /api/admin/lead-magnets/[id]] file cleanup failed:', error)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/lead-magnets/[id]] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete lead magnet' }, { status: 500 })
  }
}
