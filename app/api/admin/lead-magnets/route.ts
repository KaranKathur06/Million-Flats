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

export async function GET() {
  const access = await assertAdmin()
  if (!access.ok) return access.response

  if (!hasLeadMagnetClient()) {
    return NextResponse.json(
      { success: false, message: 'Lead magnet models are not available yet. Run prisma generate on the deployment host.' },
      { status: 503 }
    )
  }

  const rows = await (prisma as any).leadMagnet.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { downloads: true } },
    },
  })

  const data = rows.map((item: any) => ({
    id: String(item.id),
    slug: String(item.slug),
    title: String(item.title),
    subtitle: item.subtitle ? String(item.subtitle) : '',
    ctaLabel: String(item.ctaLabel || 'Download Free Guide'),
    loginHint: String(item.loginHint || 'Login required'),
    badgeText: item.badgeText ? String(item.badgeText) : '',
    fileS3Key: String(item.fileS3Key || ''),
    isActive: Boolean(item.isActive),
    popupEnabled: Boolean(item.popupEnabled),
    popupDelaySeconds: toInt(item.popupDelaySeconds, 4, 1, 30),
    popupScrollPercent: toInt(item.popupScrollPercent, 25, 5, 80),
    cooldownHours: toInt(item.cooldownHours, 24, 1, 168),
    sortOrder: toInt(item.sortOrder, 0, -9999, 9999),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    downloadsCount: Number(item?._count?.downloads || 0),
  }))

  const totals = await (prisma as any).leadMagnetDownload.aggregate({
    _count: { id: true },
  })

  return NextResponse.json({ success: true, data, totals: { downloads: Number(totals?._count?.id || 0) } })
}

export async function POST(req: Request) {
  const access = await assertAdmin()
  if (!access.ok) return access.response

  if (!hasLeadMagnetClient()) {
    return NextResponse.json(
      { success: false, message: 'Lead magnet models are not available yet. Run prisma generate on the deployment host.' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => null)
  const slug = String(body?.slug || '').trim().toLowerCase()
  const title = String(body?.title || '').trim()
  const fileS3Key = String(body?.fileS3Key || '').trim()

  if (!slug) return NextResponse.json({ success: false, message: 'Slug is required' }, { status: 400 })
  if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 })
  if (!fileS3Key || !fileS3Key.startsWith('private/')) {
    return NextResponse.json({ success: false, message: 'A private S3 PDF key is required' }, { status: 400 })
  }

  try {
    const created = await (prisma as any).leadMagnet.create({
      data: {
        slug,
        title,
        subtitle: String(body?.subtitle || '').trim() || null,
        ctaLabel: String(body?.ctaLabel || 'Download Free Guide').trim(),
        loginHint: String(body?.loginHint || 'Login required').trim(),
        badgeText: String(body?.badgeText || '').trim() || null,
        fileS3Key,
        isActive: Boolean(body?.isActive ?? true),
        popupEnabled: Boolean(body?.popupEnabled ?? true),
        popupDelaySeconds: toInt(body?.popupDelaySeconds, 4, 1, 30),
        popupScrollPercent: toInt(body?.popupScrollPercent, 25, 5, 80),
        cooldownHours: toInt(body?.cooldownHours, 24, 1, 168),
        sortOrder: toInt(body?.sortOrder, 0, -9999, 9999),
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/lead-magnets] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to create lead magnet' }, { status: 500 })
  }
}
