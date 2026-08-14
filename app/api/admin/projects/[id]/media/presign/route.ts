import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectMediaTypeKey } from '@/lib/s3'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Server-side image size limit (100 MB by default, configurable via env)
const IMAGE_MAX_SIZE = Number(process.env.PROJECT_IMAGE_MAX_SIZE_BYTES) || 100 * 1024 * 1024

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']

// Valid media categories
const VALID_CATEGORIES = ['hero', 'gallery', 'interior', 'exterior', 'amenities', 'lifestyle', 'floor_plan'] as const

/**
 * POST /api/admin/projects/[id]/media/presign
 *
 * Returns a pre-signed S3 PUT URL for direct media upload.
 * The client uploads the image directly to S3, then must call /api/admin/projects/[id]/media/finalize
 * to record the media metadata in the database.
 *
 * Body:
 * {
 *   fileName: string,
 *   fileSizeBytes: number,
 *   contentType: string (e.g. "image/jpeg"),
 *   category: string (hero|gallery|interior|exterior|amenities|lifestyle|floor_plan)
 * }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { fileName, fileSizeBytes, contentType, category } = await req.json()

    // Validate inputs
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'fileName is required' },
        { status: 400 }
      )
    }

    if (!contentType || typeof contentType !== 'string') {
      return NextResponse.json(
        { success: false, message: 'contentType is required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          message: `Only image files are allowed (${ALLOWED_IMAGE_TYPES.join(', ')})`,
        },
        { status: 400 }
      )
    }

    if (!fileSizeBytes || typeof fileSizeBytes !== 'number' || fileSizeBytes <= 0) {
      return NextResponse.json(
        { success: false, message: 'fileSizeBytes must be a positive number' },
        { status: 400 }
      )
    }

    // Validate file size
    if (fileSizeBytes > IMAGE_MAX_SIZE) {
      const maxMB = Math.floor(IMAGE_MAX_SIZE / 1024 / 1024)
      return NextResponse.json(
        {
          success: false,
          message: `Image exceeds maximum size of ${maxMB}MB (attempted: ${Math.floor(fileSizeBytes / 1024 / 1024)}MB)`,
        },
        { status: 413 }
      )
    }

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      )
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
    const s3Key = buildProjectMediaTypeKey({
      developerSlug: project.developer?.slug,
      projectSlug: project.slug,
      originalName: fileName,
      contentType,
      mediaType: category.toLowerCase(),
    })

    // Create S3 client and generate presigned URL
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
      Metadata: {
        'uploaded-by': auth.userId || 'admin',
        'project-id': params.id,
        'original-name': fileName,
        'media-category': category.toLowerCase(),
      },
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }) // 10 min expiry

    return NextResponse.json({
      success: true,
      uploadUrl,
      s3Key,
      expiresIn: 600,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/[id]/media/presign]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
