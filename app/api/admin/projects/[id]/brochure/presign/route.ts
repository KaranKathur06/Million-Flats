import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectBrochureKey } from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@/lib/prisma'
import { getS3Client } from '@/lib/s3'

export const runtime = 'nodejs'
const MAX_BROCHURE_SIZE = 300 * 1024 * 1024

/**
 * POST /api/admin/projects/[id]/brochure/presign
 * 
 * Returns a pre-signed S3 PUT URL for direct brochure upload.
 * The client uploads the PDF directly to S3, then must call /api/admin/projects/[id]/brochure/finalize
 * to record the brochure metadata in the database.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { fileName, fileSizeBytes, contentType } = await req.json()

    // Validate inputs
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'fileName is required' },
        { status: 400 }
      )
    }

    if (!contentType || contentType !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF files are allowed (application/pdf)' },
        { status: 400 }
      )
    }

    if (!/\.pdf$/i.test(fileName)) {
      return NextResponse.json({ success: false, message: 'PDF file extension is required' }, { status: 400 })
    }

    if (!fileSizeBytes || typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
      return NextResponse.json(
        { success: false, message: 'fileSizeBytes must be a positive number' },
        { status: 400 }
      )
    }
    if (fileSizeBytes > MAX_BROCHURE_SIZE) {
      return NextResponse.json({ success: false, message: 'Brochure exceeds the maximum size of 300MB' }, { status: 413 })
    }

    // Verify project exists and get developer/project info for S3 key
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

    // Build S3 key
    const s3Key = buildProjectBrochureKey({
      developerSlug: project.developer?.slug,
      projectSlug: project.slug,
      originalName: fileName,
      contentType,
    })

    // Create S3 client and generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
      Metadata: {
        'uploaded-by': auth.userId || 'admin',
        'project-id': params.id,
        'original-name': fileName,
      },
    })

    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 600 })

    return NextResponse.json({
      success: true,
      uploadUrl,
      s3Key,
      expiresIn: 600,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/[id]/brochure/presign]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
