import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectMediaTypeKey, normalizeProjectImageFilename, uploadToS3Key, buildS3ObjectUrl } from '@/lib/s3'

const CATEGORY_VALUES = ['hero', 'gallery', 'interior', 'exterior', 'amenities', 'lifestyle', 'floor_plan'] as const

const saveMediaSchema = z.object({
    url: z.string().url(),
    label: z.string().max(300).optional().nullable(),
    category: z.enum(CATEGORY_VALUES),
    sortOrder: z.number().int().min(0).optional().nullable(),
    s3Key: z.string().min(1).optional().nullable(),
    unitVariantId: z.string().optional().nullable(),
})

function labelFromFilename(filename: string) {
    const dot = filename.lastIndexOf('.')
    const base = dot > 0 ? filename.slice(0, dot) : filename
    return base
        .replace(/_/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

function toEnumCategory(category: (typeof CATEGORY_VALUES)[number]) {
    return category === 'floor_plan' ? 'FLOOR_PLAN' : category.toUpperCase()
}

async function getProject(id: string) {
    return (prisma as any).project.findUnique({
        where: { id },
        select: { id: true, slug: true, developer: { select: { slug: true, name: true } } },
    })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const project = await getProject(params.id)
        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        const contentType = String(req.headers.get('content-type') || '').toLowerCase()

        // New contract: save already-uploaded S3 URL in DB
        if (contentType.includes('application/json')) {
            const parsed = saveMediaSchema.safeParse(await req.json().catch(() => ({})))
            if (!parsed.success) {
                return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
            }

            const data = parsed.data
            const media = await (prisma as any).projectMedia.create({
                data: {
                    projectId: params.id,
                    mediaUrl: data.url,
                    mediaType: data.category,
                    category: toEnumCategory(data.category),
                    label: data.label?.trim() || null,
                    s3Key: data.s3Key || null,
                    sortOrder: data.sortOrder ?? 0,
                },
            })

            if (data.category === 'hero') {
                await (prisma as any).project.update({
                    where: { id: params.id },
                    data: { coverImage: data.url },
                })
            }
            if (data.category === 'floor_plan') {
                const linkedVariant = data.unitVariantId
                    ? await (prisma as any).projectUnitVariant.findFirst({
                        where: { id: data.unitVariantId, projectId: params.id },
                        select: { id: true, title: true, unitType: { select: { bedrooms: true, bathrooms: true } } },
                    })
                    : null

                await (prisma as any).projectFloorPlan.create({
                    data: {
                        projectId: params.id,
                        unitVariantId: linkedVariant?.id || null,
                        unitType: data.label?.trim() || linkedVariant?.title || 'Floor Plan',
                        bedrooms: linkedVariant?.unitType?.bedrooms ?? null,
                        bathrooms: linkedVariant?.unitType?.bathrooms ?? null,
                        imageUrl: data.url,
                        s3Key: data.s3Key || null,
                    },
                })
            }

            return NextResponse.json({ success: true, media }, { status: 201 })
        }

        // Backward-compatible multipart upload path
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const rawCategory = String(formData.get('category') || formData.get('mediaType') || 'interior').toLowerCase()
        const category = rawCategory === 'cover' || rawCategory === 'hero'
            ? 'hero'
            : rawCategory === 'floor-plans' || rawCategory === 'floorplan'
                ? 'floor_plan'
                : rawCategory
        const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0
        const unitVariantId = String(formData.get('unitVariantId') || '').trim() || null

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
        }
        if (!CATEGORY_VALUES.includes(category as any)) {
            return NextResponse.json({ success: false, message: 'Invalid category' }, { status: 400 })
        }
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ success: false, message: 'File too large (max 50MB)' }, { status: 400 })
        }

        const devSlug = project.developer?.slug || project.developer?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'unknown'
        const normalizedFilename = normalizeProjectImageFilename({ originalName: file.name, contentType: file.type })
        const key = buildProjectMediaTypeKey({
            developerSlug: devSlug,
            projectSlug: project.slug,
            originalName: normalizedFilename,
            contentType: file.type,
            mediaType: category,
        })

        const buffer = Buffer.from(await file.arrayBuffer())
        const { key: uploadedKey } = await uploadToS3Key({ buffer, key, contentType: file.type || 'image/jpeg' })
        const url = buildS3ObjectUrl({ key: uploadedKey })

        const media = await (prisma as any).projectMedia.create({
            data: {
                projectId: params.id,
                mediaUrl: url,
                mediaType: category,
                category: toEnumCategory(category as any),
                label: labelFromFilename(normalizedFilename),
                s3Key: uploadedKey,
                sortOrder,
            },
        })

        if (category === 'hero') {
            await (prisma as any).project.update({
                where: { id: params.id },
                data: { coverImage: url },
            })
        }
        if (category === 'floor_plan') {
            const linkedVariant = unitVariantId
                ? await (prisma as any).projectUnitVariant.findFirst({
                    where: { id: unitVariantId, projectId: params.id },
                    select: { id: true, title: true, unitType: { select: { bedrooms: true, bathrooms: true } } },
                })
                : null

            await (prisma as any).projectFloorPlan.create({
                data: {
                    projectId: params.id,
                    unitVariantId: linkedVariant?.id || null,
                    unitType: labelFromFilename(normalizedFilename) || linkedVariant?.title || 'Floor Plan',
                    bedrooms: linkedVariant?.unitType?.bedrooms ?? null,
                    bathrooms: linkedVariant?.unitType?.bathrooms ?? null,
                    imageUrl: url,
                    s3Key: uploadedKey,
                },
            })
        }

        return NextResponse.json({ success: true, media }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/projects/[id]/media]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
