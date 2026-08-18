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
    const { s3Key, fileName, fileSizeBytes, category, label, unitTypeId } = await req.json()

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

    if (String(category).toLowerCase() === 'floor_plan') {
      const normalizedUnitTypeId = String(unitTypeId || '').trim()
      if (!normalizedUnitTypeId) {
        return NextResponse.json({ success: false, message: 'unitTypeId is required for floor plan uploads' }, { status: 400 })
      }

      const unitType = await (prisma as any).projectUnitType.findFirst({
        where: { id: normalizedUnitTypeId, projectId: params.id },
        select: { id: true, unitType: true, bedrooms: true, bathrooms: true },
      })

      if (!unitType) {
        return NextResponse.json({ success: false, message: 'Unit type not found for this project' }, { status: 400 })
      }
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
    let media: any = null

    if (String(category).toLowerCase() === 'floor_plan') {
      const normalizedUnitTypeId = String(unitTypeId || '').trim()
      const unitType = await (prisma as any).projectUnitType.findFirst({
        where: { id: normalizedUnitTypeId, projectId: params.id },
        select: { id: true, unitType: true, bedrooms: true, bathrooms: true },
      })

      const variant = await (prisma as any).projectUnitVariant.findFirst({
        where: { projectId: params.id, unitTypeId: normalizedUnitTypeId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })

      const existingFloorPlan = await (prisma as any).projectFloorPlan.findFirst({
        where: {
          projectId: params.id,
          ...(variant ? { unitVariantId: variant.id } : {}),
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, projectId: true },
      })

      if (existingFloorPlan) {
        media = await (prisma as any).projectFloorPlan.update({
          where: { id: existingFloorPlan.id },
          data: {
            unitVariantId: variant?.id || null,
            unitType: unitType?.unitType || 'Floor Plan',
            bedrooms: unitType?.bedrooms ?? null,
            bathrooms: unitType?.bathrooms ?? null,
            imageUrl: buildCdnAssetUrl({ key: s3Key }) || s3Key,
            s3Key,
          },
        })
      } else {
        media = await (prisma as any).projectFloorPlan.create({
          data: {
            projectId: params.id,
            unitVariantId: variant?.id || null,
            unitType: unitType?.unitType || 'Floor Plan',
            bedrooms: unitType?.bedrooms ?? null,
            bathrooms: unitType?.bathrooms ?? null,
            imageUrl: buildCdnAssetUrl({ key: s3Key }) || s3Key,
            s3Key,
          },
        })
      }
    } else {
      media = await (prisma as any).projectMedia.create({
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
    }

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
        mediaUrl: media.mediaUrl || media.imageUrl || s3Key,
        category: media.category || 'floor_plan',
        label: media.label || null,
        sortOrder: media.sortOrder ?? null,
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
