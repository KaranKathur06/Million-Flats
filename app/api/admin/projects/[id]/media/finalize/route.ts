import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { buildCdnAssetUrl } from '@/lib/s3'
import { PROJECT_MEDIA_CATEGORY_VALUES, projectMediaCategoryToEnum } from '@/lib/projectMediaTaxonomy'

export const runtime = 'nodejs'

const VALID_CATEGORIES = PROJECT_MEDIA_CATEGORY_VALUES


/**
 * POST /api/admin/projects/[id]/media/finalize
 *
 * Called after the client has successfully uploaded an image to S3 via presigned URL.
 * Records the media metadata in the database.
 *
 * Body:
 * {
 *   s3Key: string,
 *   fileName: string,
 *   fileSizeBytes: number,
 *   category: string,
 *   label?: string
 * }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { s3Key, fileName, fileSizeBytes, category, label } = await req.json()

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

    if (!category || !VALID_CATEGORIES.includes(category.toLowerCase() as any)) {
      return NextResponse.json(
        { success: false, message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    const categoryEnum = projectMediaCategoryToEnum(category)
    if (categoryEnum === 'HERO') {
      const existingHero = await (prisma as any).projectMedia.findFirst({
        where: { projectId: params.id, category: 'HERO' },
      })
      if (existingHero) {
        await (prisma as any).projectMedia.update({
          where: { id: existingHero.id },
          data: { category: null, mediaType: 'hero' },
        })
      }
    }

    // Create media record
    const media = await (prisma as any).projectMedia.create({
      data: {
        projectId: params.id,
        mediaUrl: s3Key,
        mediaType: category.toLowerCase(),
        category: categoryEnum,
        label: label?.trim() || null,
        s3Key,
        sortOrder: 0,
      },
    })

    // Update project coverImage if this is HERO
    if (categoryEnum === 'HERO') {
      const publicUrl = buildCdnAssetUrl({ key: s3Key }) || s3Key
      await (prisma as any).project.update({
        where: { id: params.id },
        data: { coverImage: publicUrl },
      })
    }

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        mediaUrl: media.mediaUrl,
        category: media.category,
        label: media.label,
        sortOrder: media.sortOrder,
      },
    })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/[id]/media/finalize]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to finalize media upload' },
      { status: 500 }
    )
  }
}
