import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { buildCdnAssetUrl } from '@/lib/s3'

export const runtime = 'nodejs'

// Valid media categories
const VALID_CATEGORIES = ['hero', 'gallery', 'interior', 'exterior', 'amenities', 'lifestyle', 'floor_plan'] as const

function toCategoryEnum(category: string) {
  const normalized = category.toLowerCase()
  if (normalized === 'floor_plan' || normalized === 'floor-plan' || normalized === 'floorplan') return 'FLOOR_PLAN'
  return normalized.toUpperCase()
}

/**
 * PUT /api/admin/projects/[id]/media/[mediaId]
 *
 * Update media properties: category, label, sortOrder
 *
 * Body:
 * {
 *   category?: string,
 *   label?: string,
 *   sortOrder?: number
 * }
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { category, label, sortOrder } = await req.json()

    // Verify media exists and belongs to this project
    const media = await (prisma as any).projectMedia.findUnique({
      where: { id: params.mediaId },
      select: { id: true, projectId: true, category: true, mediaUrl: true, s3Key: true },
    })

    if (!media || media.projectId !== params.id) {
      return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 })
    }

    // Build update object
    const updateData: any = {}

    // Update category if provided
    if (category) {
      if (!VALID_CATEGORIES.includes(category.toLowerCase() as any)) {
        return NextResponse.json(
          { success: false, message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }

      const newCategoryEnum = toCategoryEnum(category)
      updateData.category = newCategoryEnum
      updateData.mediaType = category.toLowerCase()

      // If changing to HERO, demote existing HERO
      if (newCategoryEnum === 'HERO') {
        const existingHero = await (prisma as any).projectMedia.findFirst({
          where: { projectId: params.id, category: 'HERO', id: { not: params.mediaId } },
        })
        if (existingHero) {
          await (prisma as any).projectMedia.update({
            where: { id: existingHero.id },
            data: { category: 'GALLERY', mediaType: 'gallery' },
          })
        }

        // Update project coverImage
        const publicUrl = buildCdnAssetUrl({ key: media.s3Key || media.mediaUrl }) || media.mediaUrl
        await (prisma as any).project.update({
          where: { id: params.id },
          data: { coverImage: publicUrl },
        })
      }
    }

    // Update label if provided
    if (label !== undefined) {
      updateData.label = label?.trim() || null
    }

    // Update sortOrder if provided
    if (sortOrder !== undefined && sortOrder !== null) {
      updateData.sortOrder = Math.max(0, Math.floor(sortOrder))
    }

    // Apply updates
    const updated = await (prisma as any).projectMedia.update({
      where: { id: params.mediaId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      media: {
        id: updated.id,
        mediaUrl: updated.mediaUrl,
        category: updated.category?.toLowerCase(),
        label: updated.label,
        sortOrder: updated.sortOrder,
      },
    })
  } catch (err: any) {
    console.error('[PUT /api/admin/projects/[id]/media/[mediaId]]', err)
    return NextResponse.json(
      { success: false, message: 'Failed to update media' },
      { status: 500 }
    )
  }
}
