import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { uploadToS3Key, deleteFromS3, buildProjectBrochureKey, buildS3ObjectUrl } from '@/lib/s3'

export const runtime = 'nodejs'

// POST — Upload brochure PDF
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, developer: { select: { slug: true } } },
    })
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    // Validate PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, message: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate size (20MB max)
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, message: 'File size must be 20MB or smaller' }, { status: 400 })
    }

    // Delete existing brochure if any
    const existing = await (prisma as any).projectBrochure.findUnique({
      where: { projectId: params.id },
    })
    if (existing?.s3Key) {
      try { await deleteFromS3(existing.s3Key) } catch (e) { console.warn('Failed to delete old brochure from S3:', e) }
    }
    if (existing) {
      await (prisma as any).projectBrochure.delete({ where: { projectId: params.id } })
    }

    // Build S3 key
    const s3Key = buildProjectBrochureKey({
      developerSlug: project.developer?.slug,
      projectSlug: project.slug,
      originalName: file.name,
      contentType: file.type,
    })

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer())
    const { objectUrl } = await uploadToS3Key({
      buffer,
      key: s3Key,
      contentType: file.type,
    })

    // Save to DB
    const brochure = await (prisma as any).projectBrochure.create({
      data: {
        projectId: params.id,
        fileUrl: objectUrl,
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    })

    // Also update the brochureUrl field on the Project model for backward compatibility
    await (prisma as any).project.update({
      where: { id: params.id },
      data: { brochureUrl: objectUrl },
    })

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
    console.error('[POST /api/admin/projects/[id]/brochure]', err)
    return NextResponse.json({ success: false, message: 'Failed to upload brochure' }, { status: 500 })
  }
}

// DELETE — Remove brochure
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const existing = await (prisma as any).projectBrochure.findUnique({
      where: { projectId: params.id },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'No brochure found' }, { status: 404 })
    }

    // Delete from S3
    if (existing.s3Key) {
      try { await deleteFromS3(existing.s3Key) } catch (e) { console.warn('Failed to delete brochure from S3:', e) }
    }

    // Delete from DB
    await (prisma as any).projectBrochure.delete({ where: { projectId: params.id } })

    // Clear brochureUrl on Project
    await (prisma as any).project.update({
      where: { id: params.id },
      data: { brochureUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/admin/projects/[id]/brochure]', err)
    return NextResponse.json({ success: false, message: 'Failed to delete brochure' }, { status: 500 })
  }
}
