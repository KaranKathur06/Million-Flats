import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { parseAEDInput } from '@/lib/pricing'

const updateProjectSchema = z.object({
    name: z.string().min(1).max(300).optional(),
    slug: z.string().min(1).max(200).optional(),
    developerId: z.string().min(1).optional(),
    countryIso2: z.string().max(2).optional().nullable(),
    city: z.string().max(200).optional().nullable(),
    community: z.string().max(200).optional().nullable(),
    description: z.string().max(10000).optional().nullable(),
    overview: z.string().max(20000).optional().nullable(),
    completionYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startingPrice: z.union([z.number(), z.string()]).optional().nullable(),
    goldenVisa: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    featuredOrder: z.number().int().min(0).optional().nullable(),
    coverImage: z.string().max(2000).optional().nullable(),
    unitTypes: z
        .array(
            z.object({
                id: z.string().optional(),
                unitType: z.string().min(1).max(100),
                sizeFrom: z.number().int().min(0).optional().nullable(),
                sizeTo: z.number().int().min(0).optional().nullable(),
                priceFrom: z.union([z.number(), z.string()]).optional().nullable(),
            })
        )
        .optional(),
    floorPlans: z
        .array(
            z.object({
                id: z.string().optional(),
                unitType: z.string().min(1).max(100),
                bedrooms: z.number().int().min(0).max(20).optional().nullable(),
                bathrooms: z.number().int().min(0).max(20).optional().nullable(),
                size: z.string().max(100).optional().nullable(),
                price: z.string().max(100).optional().nullable(),
                imageUrl: z.string().max(2000).optional().nullable(),
            })
        )
        .optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const project = await (prisma as any).project.findUnique({
            where: { id: params.id },
            include: {
                developer: { select: { id: true, name: true, slug: true, logo: true } },
                media: { orderBy: { sortOrder: 'asc' } },
                unitTypes: true,
                _count: { select: { leads: true } },
                floorPlans: { orderBy: { createdAt: 'asc' } },
            },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, project })
    } catch (err: any) {
        console.error('[GET /api/admin/projects/[id]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const existing = await (prisma as any).project.findUnique({ where: { id: params.id } })
        if (!existing) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = updateProjectSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const data = parsed.data
        const normalizedStartingPrice = parseAEDInput(data.startingPrice)
        if (data.startingPrice !== undefined && data.startingPrice !== null && normalizedStartingPrice === null) {
            return NextResponse.json({ success: false, message: 'Invalid startingPrice. Use values like 2160000, 2.16M, 750K.' }, { status: 400 })
        }

        // Check slug uniqueness if changing
        if (data.slug && data.slug !== existing.slug) {
            const slugConflict = await (prisma as any).project.findUnique({ where: { slug: data.slug } })
            if (slugConflict) {
                return NextResponse.json({ success: false, message: 'Slug already exists' }, { status: 409 })
            }
        }

        // Build update data (only include provided fields)
        const updateData: any = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.slug !== undefined) updateData.slug = data.slug
        if (data.developerId !== undefined) updateData.developerId = data.developerId
        if (data.countryIso2 !== undefined) updateData.countryIso2 = data.countryIso2
        if (data.city !== undefined) updateData.city = data.city
        if (data.community !== undefined) updateData.community = data.community
        if (data.description !== undefined) updateData.description = data.description
        if (data.overview !== undefined) updateData.overview = data.overview
        if (data.completionYear !== undefined) updateData.completionYear = data.completionYear
        if (data.startingPrice !== undefined) updateData.startingPrice = normalizedStartingPrice
        if (data.goldenVisa !== undefined) updateData.goldenVisa = data.goldenVisa
        if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
        if (data.featuredOrder !== undefined) updateData.featuredOrder = data.featuredOrder
        if (data.coverImage !== undefined) updateData.coverImage = data.coverImage

        // Handle unit types: replace all if provided
        if (data.unitTypes !== undefined) {
            await (prisma as any).projectUnitType.deleteMany({ where: { projectId: params.id } })
            if (data.unitTypes.length > 0) {
                await (prisma as any).projectUnitType.createMany({
                    data: data.unitTypes.map((ut) => ({
                        projectId: params.id,
                        unitType: ut.unitType,
                        sizeFrom: ut.sizeFrom ?? null,
                        sizeTo: ut.sizeTo ?? null,
                        priceFrom: parseAEDInput(ut.priceFrom) ?? null,
                    })),
                })
            }
        }
        if (data.floorPlans !== undefined) {
            await (prisma as any).projectFloorPlan.deleteMany({ where: { projectId: params.id } })
            if (data.floorPlans.length > 0) {
                await (prisma as any).projectFloorPlan.createMany({
                    data: data.floorPlans.map((fp) => ({
                        projectId: params.id,
                        unitType: fp.unitType,
                        bedrooms: fp.bedrooms ?? null,
                        bathrooms: fp.bathrooms ?? null,
                        size: fp.size ?? null,
                        price: fp.price ?? null,
                        imageUrl: fp.imageUrl ?? null,
                    })),
                })
            }
        }

        const updated = await (prisma as any).project.update({
            where: { id: params.id },
            data: updateData,
            select: { id: true, slug: true, status: true },
        })

        return NextResponse.json({ success: true, project: updated })
    } catch (err: any) {
        console.error('[PUT /api/admin/projects/[id]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
