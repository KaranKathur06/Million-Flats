import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { deleteFromS3 } from '@/lib/s3'
import { uploadFile, UploadServiceError } from '@/services/uploadService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LeadMagnetStatusValue = 'DRAFT' | 'UPLOADED' | 'PUBLISHED' | 'ACTIVE'

function forbidden(message = 'Forbidden', status = 403) {
  return NextResponse.json({ success: false, message }, { status })
}

function determineLeadMagnetStatus(item: { fileS3Key?: string | null; isActive?: boolean; popupEnabled?: boolean }): LeadMagnetStatusValue {
  if (!String(item.fileS3Key || '').trim()) return 'DRAFT'
  if (Boolean(item.isActive)) return 'ACTIVE'
  if (Boolean(item.popupEnabled)) return 'PUBLISHED'
  return 'UPLOADED'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) return forbidden('Unauthorized', 401)
  if (!hasMinRole(role, 'ADMIN')) return forbidden()

  const id = String(params.id || '').trim()
  if (!id) {
    return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).leadMagnet.findUnique({
      where: { id },
      select: { id: true, slug: true, fileS3Key: true, isActive: true, popupEnabled: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Lead magnet not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'PDF file is required' }, { status: 400 })
    }

    const uploaded = await uploadFile({
      file,
      visibility: 'private',
      module: 'lead-magnets',
      subModule: 'faq',
      entityId: String(existing.slug),
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 10 * 1024 * 1024,
    })

    const status = determineLeadMagnetStatus({
      fileS3Key: uploaded.key,
      isActive: existing.isActive,
      popupEnabled: existing.popupEnabled,
    })

    const updated = await (prisma as any).leadMagnet.update({
      where: { id },
      data: {
        fileS3Key: uploaded.key,
        status,
      },
    })

    if (existing.fileS3Key && existing.fileS3Key !== uploaded.key) {
      await deleteFromS3(String(existing.fileS3Key)).catch((error) => {
        console.error('[POST /api/admin/lead-magnets/[id]/upload] old file cleanup failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      data: updated,
      file_url: uploaded.url,
      file_s3_key: uploaded.key,
    })
  } catch (error) {
    if (error instanceof UploadServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/lead-magnets/[id]/upload] failed:', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) return forbidden('Unauthorized', 401)
  if (!hasMinRole(role, 'ADMIN')) return forbidden()

  const id = String(params.id || '').trim()
  if (!id) {
    return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).leadMagnet.findUnique({
      where: { id },
      select: { id: true, fileS3Key: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Lead magnet not found' }, { status: 404 })
    }

    if (!existing.fileS3Key) {
      return NextResponse.json({ success: true, data: { id, fileS3Key: null, status: 'draft' } })
    }

    await (prisma as any).leadMagnet.update({
      where: { id },
      data: {
        fileS3Key: null,
        status: 'DRAFT',
        isActive: false,
        popupEnabled: false,
      },
    })

    await deleteFromS3(String(existing.fileS3Key)).catch((error) => {
      console.error('[DELETE /api/admin/lead-magnets/[id]/upload] file cleanup failed:', error)
    })

    return NextResponse.json({ success: true, data: { id, fileS3Key: null, status: 'draft' } })
  } catch (error) {
    console.error('[DELETE /api/admin/lead-magnets/[id]/upload] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete file' }, { status: 500 })
  }
}
