import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

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

  const nextFileS3Key = body?.fileS3Key !== undefined ? String(body.fileS3Key).trim() : undefined
  if (nextFileS3Key !== undefined && nextFileS3Key !== '' && !nextFileS3Key.startsWith('private/')) {
    return NextResponse.json({ success: false, message: 'fileS3Key must be a private S3 key' }, { status: 400 })
  }

  try {
    const updated = await (prisma as any).leadMagnet.update({
      where: { id },
      data: {
        slug: body?.slug ? String(body.slug).trim().toLowerCase() : undefined,
        title: body?.title !== undefined ? String(body.title).trim() : undefined,
        subtitle: body?.subtitle !== undefined ? (String(body.subtitle).trim() || null) : undefined,
        ctaLabel: body?.ctaLabel !== undefined ? String(body.ctaLabel).trim() : undefined,
        loginHint: body?.loginHint !== undefined ? String(body.loginHint).trim() : undefined,
        badgeText: body?.badgeText !== undefined ? (String(body.badgeText).trim() || null) : undefined,
        fileS3Key: nextFileS3Key,
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
        popupEnabled: body?.popupEnabled !== undefined ? Boolean(body.popupEnabled) : undefined,
        popupDelaySeconds: body?.popupDelaySeconds !== undefined ? toInt(body.popupDelaySeconds, 4, 1, 30) : undefined,
        popupScrollPercent: body?.popupScrollPercent !== undefined ? toInt(body.popupScrollPercent, 25, 5, 80) : undefined,
        cooldownHours: body?.cooldownHours !== undefined ? toInt(body.cooldownHours, 24, 1, 168) : undefined,
        sortOrder: body?.sortOrder !== undefined ? toInt(body.sortOrder, 0, -9999, 9999) : undefined,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[PATCH /api/admin/lead-magnets/[id]] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to update lead magnet' }, { status: 500 })
  }
}

