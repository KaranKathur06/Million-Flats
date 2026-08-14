import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { deleteFromS3, buildCdnAssetUrl } from '@/lib/s3'

import { PROJECT_MEDIA_CATEGORY_VALUES, projectMediaCategoryToEnum } from '@/lib/projectMediaTaxonomy'

const VALID_CATEGORIES = PROJECT_MEDIA_CATEGORY_VALUES

function toCategoryEnum(category: string) {
  return projectMediaCategoryToEnum(category) || 'HERO'
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string; mediaId: string } }
) {
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
                        data: { category: null, mediaType: 'hero' },
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
        return NextResponse.json({ success: false, message: 'Failed to update media' }, { status: 500 })
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string; mediaId: string } }
) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const media = await (prisma as any).projectMedia.findUnique({
            where: { id: params.mediaId },
            select: { id: true, projectId: true, s3Key: true, mediaUrl: true, category: true, mediaType: true },
        })

        if (!media || media.projectId !== params.id) {
            return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 })
        }

        // Delete from S3 if key exists
        if (media.s3Key) {
            try {
                await deleteFromS3(media.s3Key)
            } catch (s3Err) {
                console.error('[DELETE media] S3 delete failed (non-blocking):', s3Err)
            }
        }

        await (prisma as any).projectMedia.delete({ where: { id: params.mediaId } })

        const category = String(media.category || media.mediaType || '').toLowerCase()
        if (category === 'floor_plan' || category === 'floor-plan' || category === 'floorplan') {
            const floorPlanOr: any[] = []
            if (media.s3Key) floorPlanOr.push({ s3Key: media.s3Key })
            if (media.mediaUrl) floorPlanOr.push({ imageUrl: media.mediaUrl })
            await (prisma as any).projectFloorPlan.deleteMany({
                where: {
                    projectId: params.id,
                    ...(floorPlanOr.length > 0 ? { OR: floorPlanOr } : {}),
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[DELETE /api/admin/projects/[id]/media/[mediaId]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
