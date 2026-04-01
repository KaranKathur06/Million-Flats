import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { uploadFile, UploadServiceError } from '@/services/uploadService'
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

  const contentType = String(req.headers.get('content-type') || '').toLowerCase()
  const isMultipart = contentType.includes('multipart/form-data')
  let uploadedFileKey: string | null = null

  try {
    let slug = ''
    let title = ''
    let subtitle = ''
    let ctaLabel = 'Download Free Guide'
    let loginHint = 'Login required'
    let badgeText = ''
    let isActive = true
    let popupEnabled = true
    let popupDelaySeconds = 4
    let popupScrollPercent = 25
    let cooldownHours = 24
    let sortOrder = 0
    let fileS3Key = ''
    let fileUrl: string | null = null

    if (isMultipart) {
      const formData = await req.formData()
      const file = formData.get('file')

      slug = String(formData.get('slug') || '').trim().toLowerCase()
      title = String(formData.get('title') || '').trim()
      subtitle = String(formData.get('subtitle') || '').trim()
      ctaLabel = String(formData.get('ctaLabel') || ctaLabel).trim()
      loginHint = String(formData.get('loginHint') || loginHint).trim()
      badgeText = String(formData.get('badgeText') || '').trim()
      isActive = String(formData.get('isActive') || 'true').toLowerCase() !== 'false'
      popupEnabled = String(formData.get('popupEnabled') || 'true').toLowerCase() !== 'false'
      popupDelaySeconds = toInt(formData.get('popupDelaySeconds'), 4, 1, 30)
      popupScrollPercent = toInt(formData.get('popupScrollPercent'), 25, 5, 80)
      cooldownHours = toInt(formData.get('cooldownHours'), 24, 1, 168)
      sortOrder = toInt(formData.get('sortOrder'), 0, -9999, 9999)

      if (!(file instanceof File)) {
        return NextResponse.json({ success: false, message: 'PDF file is required' }, { status: 400 })
      }

      if (!slug) return NextResponse.json({ success: false, message: 'Slug is required' }, { status: 400 })
      if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 })

      const existingBySlug = await (prisma as any).leadMagnet.findUnique({ where: { slug }, select: { id: true } })
      if (existingBySlug) {
        return NextResponse.json(
          { success: false, message: 'Slug already exists. Use a new slug or update the existing lead magnet.' },
          { status: 409 }
        )
      }

      const uploaded = await uploadFile({
        file,
        visibility: 'private',
        module: 'lead-magnets',
        subModule: 'faq',
        entityId: slug || undefined,
        allowedMimeTypes: ['application/pdf'],
        maxSizeBytes: 10 * 1024 * 1024,
      })
      fileS3Key = uploaded.key
      uploadedFileKey = uploaded.key
      fileUrl = uploaded.url
    } else {
      const body = await req.json().catch(() => null)

      slug = String(body?.slug || '').trim().toLowerCase()
      title = String(body?.title || '').trim()
      subtitle = String(body?.subtitle || '').trim()
      ctaLabel = String(body?.ctaLabel || ctaLabel).trim()
      loginHint = String(body?.loginHint || loginHint).trim()
      badgeText = String(body?.badgeText || '').trim()
      isActive = Boolean(body?.isActive ?? true)
      popupEnabled = Boolean(body?.popupEnabled ?? true)
      popupDelaySeconds = toInt(body?.popupDelaySeconds, 4, 1, 30)
      popupScrollPercent = toInt(body?.popupScrollPercent, 25, 5, 80)
      cooldownHours = toInt(body?.cooldownHours, 24, 1, 168)
      sortOrder = toInt(body?.sortOrder, 0, -9999, 9999)
      fileS3Key = String(body?.fileS3Key || '').trim()
    }

    if (!slug) return NextResponse.json({ success: false, message: 'Slug is required' }, { status: 400 })
    if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 })
    if (!fileS3Key || !fileS3Key.startsWith('private/')) {
      return NextResponse.json({ success: false, message: 'A private S3 PDF key is required' }, { status: 400 })
    }

    if (!isMultipart) {
      const existingBySlug = await (prisma as any).leadMagnet.findUnique({ where: { slug }, select: { id: true } })
      if (existingBySlug) {
        return NextResponse.json(
          { success: false, message: 'Slug already exists. Use a new slug or update the existing lead magnet.' },
          { status: 409 }
        )
      }
    }

    const created = await (prisma as any).leadMagnet.create({
      data: {
        slug,
        title,
        subtitle: subtitle || null,
        ctaLabel,
        loginHint,
        badgeText: badgeText || null,
        fileS3Key,
        isActive,
        popupEnabled,
        popupDelaySeconds,
        popupScrollPercent,
        cooldownHours,
        sortOrder,
      },
    })

    return NextResponse.json({ success: true, data: created, file_url: fileUrl, file_s3_key: fileS3Key }, { status: 201 })
  } catch (error) {
    if (uploadedFileKey) {
      await deleteFromS3(uploadedFileKey).catch((cleanupError) => {
        console.error('[POST /api/admin/lead-magnets] cleanup failed:', cleanupError)
      })
    }

    if (error instanceof UploadServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Slug already exists. Use a new slug or update the existing lead magnet.' },
        { status: 409 }
      )
    }

    console.error('[POST /api/admin/lead-magnets] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to create lead magnet' }, { status: 500 })
  }
}
