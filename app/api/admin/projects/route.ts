import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { parseAEDInput } from '@/lib/pricing'

function safeString(v: unknown) {
    return typeof v === 'string' ? v.trim() : ''
}

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

const createProjectSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    developerId: z.string().min(1),
    countryIso2: z.string().max(2).optional(),
    city: z.string().max(200).optional(),
    community: z.string().max(200).optional(),
    description: z.string().max(10000).optional(),
    overview: z.string().max(20000).optional().nullable(),
    completionYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startingPrice: z.union([z.number(), z.string()]).optional().nullable(),
    goldenVisa: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    featuredOrder: z.number().int().min(0).optional().nullable(),
    coverImage: z.string().max(2000).optional(),
    unitTypes: z.array(z.object({
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
            title: z.string().min(1).max(120),
            size: z.number().int().min(0).optional().nullable(),
            price: z.union([z.number(), z.string()]).optional().nullable(),
            priceOnRequest: z.boolean().optional(),
            facing: z.string().max(80).optional().nullable(),
            view: z.string().max(120).optional().nullable(),
            availabilityStatus: z.enum(['AVAILABLE', 'SOLD_OUT']).optional(),
            availableUnitsCount: z.number().int().min(0).optional().nullable(),
            floorPlans: z.array(z.object({
                title: z.string().max(120).optional().nullable(),
                imageUrl: z.string().max(2000).optional().nullable(),
                size: z.string().max(120).optional().nullable(),
                bedrooms: z.number().int().min(0).max(20).optional().nullable(),
                bathrooms: z.number().int().min(0).max(20).optional().nullable(),
                price: z.string().max(120).optional().nullable(),
            })).optional(),
        })).optional(),
    })).optional(),
})

export async function GET(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const { searchParams } = new URL(req.url)
        const status = safeString(searchParams.get('status'))
        const developerId = safeString(searchParams.get('developerId'))

        const where: any = {}
        if (status) where.status = status
        if (developerId) where.developerId = developerId

        const items = await (prisma as any).project.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: 500,
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                startingPrice: true,
                goldenVisa: true,
                    coverImage: true,
                    isFeatured: true,
                    featuredOrder: true,
                    status: true,
                completionYear: true,
                createdAt: true,
                updatedAt: true,
                developer: { select: { id: true, name: true, slug: true } },
                media: {
                    orderBy: { sortOrder: 'asc' },
                    select: { mediaUrl: true, mediaType: true, category: true },
                },
                _count: { select: { media: true, unitTypes: true, leads: true } },
            },
        })
        const normalizedItems = (items || []).map((item: any) => {
            const hero = (item.media || []).find((m: any) => {
                const mt = String(m.mediaType || '').toLowerCase()
                const cat = String(m.category || '').toLowerCase()
                return mt === 'hero' || cat === 'hero'
            })?.mediaUrl
            const firstMedia = (item.media || []).find((m: any) => String(m.mediaUrl || '').trim())?.mediaUrl
            const heroImage = hero || item.coverImage || firstMedia || '/images/default-property.jpg'
            return {
                ...item,
                hero_image: heroImage,
                coverImage: heroImage,
                media: undefined,
            }
        })

        return NextResponse.json({ success: true, items: normalizedItems })
    } catch (err: any) {
        console.error('[GET /api/admin/projects]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = createProjectSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const data = parsed.data
        const slug = data.slug || slugify(data.name)
        const normalizedStartingPrice = parseAEDInput(data.startingPrice)
        if (data.startingPrice !== undefined && data.startingPrice !== null && normalizedStartingPrice === null) {
            return NextResponse.json({ success: false, message: 'Invalid startingPrice. Use values like 2160000, 2.16M, 750K.' }, { status: 400 })
        }

        // Check slug uniqueness
        const existing = await (prisma as any).project.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ success: false, message: 'Slug already exists' }, { status: 409 })
        }

        // Check developer exists
        const developer = await (prisma as any).developer.findUnique({ where: { id: data.developerId } })
        if (!developer) {
            return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
        }

        const flatVariantPrices: number[] = []
        for (const ut of data.unitTypes || []) {
            for (const v of ut.variants || []) {
                const parsed = parseAEDInput(v.price)
                if (parsed !== null) flatVariantPrices.push(parsed)
            }
        }
        const derivedStartingPrice = flatVariantPrices.length > 0 ? Math.min(...flatVariantPrices) : null

        const project = await (prisma as any).project.create({
            data: {
                name: data.name,
                slug,
                developerId: data.developerId,
                countryIso2: data.countryIso2 || null,
                city: data.city || null,
                community: data.community || null,
                description: data.description || null,
                overview: data.overview || null,
                completionYear: data.completionYear ?? null,
                startingPrice: normalizedStartingPrice ?? derivedStartingPrice,
                goldenVisa: data.goldenVisa || false,
                isFeatured: data.isFeatured || false,
                featuredOrder: data.isFeatured ? (data.featuredOrder ?? 0) : null,
                coverImage: data.coverImage || null,
                status: 'DRAFT',
            },
            select: { id: true, slug: true },
        })

        if (data.unitTypes?.length) {
            for (let idx = 0; idx < data.unitTypes.length; idx++) {
                const ut = data.unitTypes[idx]
                const createdType = await (prisma as any).projectUnitType.create({
                    data: {
                        projectId: project.id,
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
                    const createdVariant = await (prisma as any).projectUnitVariant.create({
                        data: {
                            projectId: project.id,
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

                    const floorPlans = (variant.floorPlans || []).filter((fp) => String(fp.imageUrl || '').trim())
                    if (floorPlans.length > 0) {
                        await (prisma as any).projectFloorPlan.createMany({
                            data: floorPlans.map((fp) => ({
                                projectId: project.id,
                                unitVariantId: createdVariant.id,
                                unitType: fp.title?.trim() || variant.title.trim(),
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

        return NextResponse.json({ success: true, project }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/projects]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
