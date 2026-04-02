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
    unitTypes: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(120).optional(),
        unitType: z.string().min(1).max(120).optional(),
        bedrooms: z.number().int().min(0).max(20).optional().nullable(),
        bathrooms: z.number().int().min(0).max(20).optional().nullable(),
        sizeMin: z.number().int().min(0).optional().nullable(),
        sizeMax: z.number().int().min(0).optional().nullable(),
        sizeFrom: z.number().int().min(0).optional().nullable(),
        sizeTo: z.number().int().min(0).optional().nullable(),
        priceFrom: z.union([z.number(), z.string()]).optional().nullable(),
        variants: z.array(z.object({
            id: z.string().optional(),
            title: z.string().min(1).max(120),
            size: z.number().int().min(0).optional().nullable(),
            price: z.union([z.number(), z.string()]).optional().nullable(),
            priceOnRequest: z.boolean().optional(),
            facing: z.string().max(80).optional().nullable(),
            view: z.string().max(120).optional().nullable(),
            availabilityStatus: z.enum(['AVAILABLE', 'SOLD_OUT']).optional(),
            availableUnitsCount: z.number().int().min(0).optional().nullable(),
            floorPlans: z.array(z.object({
                id: z.string().optional(),
                title: z.string().max(120).optional().nullable(),
                imageUrl: z.string().max(2000).optional().nullable(),
                size: z.string().max(120).optional().nullable(),
                bedrooms: z.number().int().min(0).max(20).optional().nullable(),
                bathrooms: z.number().int().min(0).max(20).optional().nullable(),
                price: z.string().max(120).optional().nullable(),
            })).optional(),
        })).optional(),
    })).optional(),
    floorPlans: z.array(z.object({
        id: z.string().optional(),
        unitType: z.string().min(1).max(120),
        bedrooms: z.number().int().min(0).max(20).optional().nullable(),
        bathrooms: z.number().int().min(0).max(20).optional().nullable(),
        size: z.string().max(120).optional().nullable(),
        price: z.string().max(120).optional().nullable(),
        imageUrl: z.string().max(2000).optional().nullable(),
    })).optional(),
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
                unitTypes: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        variants: {
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                floorPlans: { orderBy: { createdAt: 'asc' } },
                                media: { orderBy: { sortOrder: 'asc' } },
                            },
                        },
                    },
                },
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

        let derivedMinVariantPrice: number | null = null
        // Handle unit types + variants: replace all if provided
        let createdVariantByUnitTypeKey: Record<string, string> = {}
        if (data.unitTypes !== undefined) {
            await (prisma as any).unitMedia.deleteMany({
                where: { unitVariant: { projectId: params.id } },
            })
            await (prisma as any).projectFloorPlan.deleteMany({
                where: { OR: [{ unitVariant: { projectId: params.id } }, { projectId: params.id }] },
            })
            await (prisma as any).projectUnitVariant.deleteMany({ where: { projectId: params.id } })
            await (prisma as any).projectUnitType.deleteMany({ where: { projectId: params.id } })
            for (let idx = 0; idx < data.unitTypes.length; idx++) {
                const ut = data.unitTypes[idx]
                const createdType = await (prisma as any).projectUnitType.create({
                    data: {
                        projectId: params.id,
                        unitType: (ut.name || ut.unitType || `Unit Type ${idx + 1}`).trim(),
                        bedrooms: ut.bedrooms ?? null,
                        bathrooms: ut.bathrooms ?? null,
                        sizeFrom: ut.sizeMin ?? ut.sizeFrom ?? null,
                        sizeTo: ut.sizeMax ?? ut.sizeTo ?? null,
                        priceFrom: parseAEDInput(ut.priceFrom) ?? null,
                        sortOrder: idx,
                    },
                    select: { id: true, unitType: true, bedrooms: true, bathrooms: true },
                })

                for (let vIdx = 0; vIdx < (ut.variants || []).length; vIdx++) {
                    const variant = ut.variants![vIdx]
                    const variantPrice = parseAEDInput(variant.price)
                    if (variantPrice !== null) {
                        derivedMinVariantPrice = derivedMinVariantPrice === null ? variantPrice : Math.min(derivedMinVariantPrice, variantPrice)
                    }
                    const createdVariant = await (prisma as any).projectUnitVariant.create({
                        data: {
                            projectId: params.id,
                            unitTypeId: createdType.id,
                            title: variant.title.trim(),
                            size: variant.size ?? null,
                            price: variantPrice ?? null,
                            pricePerSqft: variantPrice !== null && (variant.size ?? 0) > 0
                                ? variantPrice / (variant.size as number)
                                : null,
                            facing: variant.facing?.trim() || null,
                            view: variant.view?.trim() || null,
                            availabilityStatus: variant.availabilityStatus || ((variant.availableUnitsCount ?? 1) === 0 ? 'SOLD_OUT' : 'AVAILABLE'),
                            availableUnitsCount: variant.availableUnitsCount ?? null,
                            priceOnRequest: variant.priceOnRequest ?? (variantPrice === null),
                            sortOrder: vIdx,
                        },
                        select: { id: true },
                    })
                    createdVariantByUnitTypeKey[variant.title.trim().toLowerCase()] = createdVariant.id
                    createdVariantByUnitTypeKey[createdType.unitType.trim().toLowerCase()] = createdVariant.id

                    const floorPlans = (variant.floorPlans || []).filter((fp) => String(fp.imageUrl || '').trim())
                    if (floorPlans.length > 0) {
                        await (prisma as any).projectFloorPlan.createMany({
                            data: floorPlans.map((fp) => ({
                                projectId: params.id,
                                unitVariantId: createdVariant.id,
                                unitType: fp.title?.trim() || variant.title.trim() || createdType.unitType,
                                bedrooms: fp.bedrooms ?? createdType.bedrooms ?? null,
                                bathrooms: fp.bathrooms ?? createdType.bathrooms ?? null,
                                size: fp.size?.trim() || null,
                                price: fp.price?.trim() || null,
                                imageUrl: fp.imageUrl?.trim() || null,
                            })),
                        })
                    }
                }
            }
        }

        if (data.floorPlans !== undefined && data.floorPlans.length > 0) {
            const normalized = data.floorPlans.filter((fp) => String(fp.imageUrl || '').trim())
            if (data.unitTypes === undefined) {
                const variants = await (prisma as any).projectUnitVariant.findMany({
                    where: { projectId: params.id },
                    include: { unitType: { select: { unitType: true, bedrooms: true, bathrooms: true } } },
                })
                for (const v of variants) {
                    createdVariantByUnitTypeKey[String(v.title || '').trim().toLowerCase()] = v.id
                    createdVariantByUnitTypeKey[String(v.unitType?.unitType || '').trim().toLowerCase()] = v.id
                }
                await (prisma as any).projectFloorPlan.deleteMany({ where: { projectId: params.id } })
            }
            for (const fp of normalized) {
                const key = String(fp.unitType || '').trim().toLowerCase()
                const variantId = createdVariantByUnitTypeKey[key] || null
                await (prisma as any).projectFloorPlan.create({
                    data: {
                        projectId: params.id,
                        unitVariantId: variantId,
                        unitType: fp.unitType.trim(),
                        bedrooms: fp.bedrooms ?? null,
                        bathrooms: fp.bathrooms ?? null,
                        size: fp.size?.trim() || null,
                        price: fp.price?.trim() || null,
                        imageUrl: fp.imageUrl?.trim() || null,
                    },
                })
            }
        }

        if (data.startingPrice === undefined && derivedMinVariantPrice !== null) {
            updateData.startingPrice = derivedMinVariantPrice
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
