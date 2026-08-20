import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { buildProjectBrochureKey, deleteFromS3, s3ObjectExists } from '@/lib/s3'

export const runtime = 'nodejs'

/**
 * POST /api/admin/projects/[id]/brochure/finalize
 * 
 * Called after the client has successfully uploaded a PDF to S3 via presigned URL.
 * Records the brochure metadata in the database.
 * 
 * Body:
 * {
 *   s3Key: string,
 *   fileName: string,
 *   fileSizeBytes: number
 * }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { s3Key, fileName, fileSizeBytes } = await req.json()

    // Validate inputs
    if (!s3Key || typeof s3Key !== 'string') {
      return NextResponse.json(
        { success: false, message: 's3Key is required' },
        { status: 400 }
      )
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { success: false, message: 'fileName is required' },
        { status: 400 }
      )
    }

    if (typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
      return NextResponse.json(
        { success: false, message: 'fileSizeBytes must be a positive number' },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, developer: { select: { slug: true } } },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    const brochurePrefix = buildProjectBrochureKey({
      developerSlug: project.developer?.slug,
      projectSlug: project.slug,
      originalName: 'brochure.pdf',
      contentType: 'application/pdf',
    }).replace(/[^/]+$/, '')

    if (!s3Key.startsWith(brochurePrefix)) {
      return NextResponse.json({ success: false, message: 'Invalid brochure storage key' }, { status: 400 })
    }

    if (!(await s3ObjectExists({ key: s3Key }))) {
      return NextResponse.json({ success: false, message: 'Uploaded brochure was not found in storage' }, { status: 400 })
    }

    // Delete existing brochure if any
    const existing = await (prisma as any).projectBrochure.findUnique({
      where: { projectId: params.id },
    })

    const brochure = await (prisma as any).$transaction(async (tx: any) => {
      if (existing) {
        await tx.projectBrochure.delete({ where: { projectId: params.id } })
      }
      const created = await tx.projectBrochure.create({
        data: {
          projectId: params.id,
          fileUrl: s3Key,
          s3Key,
          fileName,
          fileSize: fileSizeBytes,
          mimeType: 'application/pdf',
        },
      })
      await tx.project.update({
        where: { id: params.id },
        data: { brochureUrl: s3Key },
      })
      return created
    })

    if (existing?.s3Key) {
      try { await deleteFromS3(existing.s3Key) } catch (e) { console.warn('Failed to delete old brochure from S3:', e) }
    }

    return NextResponse.json({
      success: true,
      brochure: {
        id: brochure.id,
        fileUrl: brochure.fileUrl,
        fileName: brochure.fileName,
        fileSize: brochure.fileSize,
      },
    })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/[id]/brochure/finalize]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to finalize brochure upload' },
      { status: 500 }
    )
  }
}
