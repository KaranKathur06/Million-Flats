import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { parseAEDInput } from '@/lib/pricing'
import { resolveProjectMediaUrl } from '@/lib/media/resolveMedia'

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

type ProjectPaymentPlanItem = {
    itemType?: 'BASE_PRICE' | 'FEE'
    label: string
    amount?: string | number | null
    currency?: string | null
    milestone?: string | null
    sortOrder?: number | null
}

const createProjectSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    developerId: z.string().min(1),
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
        unitType: z.string().min(1).max(120).optional().nullable(),
        bedrooms: z.number().int().min(0).max(20).optional().nullable(),
        bathrooms: z.number().int().min(0).max(20).optional().nullable(),
        size: z.string().max(120).optional().nullable(),
        price: z.string().max(120).optional().nullable(),
        imageUrl: z.string().max(2000).optional().nullable(),
    })).optional(),
    highlights: z.array(z.string().max(200)).optional(),
    amenities: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(200),
        icon: z.string().max(100).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
    })).optional(),
    nearbyPlaces: z.array(z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(200),
        category: z.string().max(100).optional().nullable(),
        distance: z.string().max(100).optional().nullable(),
        sortOrder: z.number().int().min(0).optional().nullable(),
    })).optional(),
    paymentPlans: z.array(z.object({
        id: z.string().optional(),
        itemType: z.enum(['BASE_PRICE', 'FEE']),
        label: z.string().min(1).max(200),
        amount: z.union([z.number(), z.string()]).optional().nullable(),
        currency: z.string().max(10).optional().nullable(),
        milestone: z.string().max(200).optional().nullable(),
        sortOrder: z.number().int().min(0).optional().nullable(),
    })).optional(),
    location: z.object({
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
        address: z.string().max(500).optional().nullable(),
        mapUrl: z.string().max(2000).optional().nullable(),
    }).optional().nullable(),
    videos: z.array(z.object({
        id: z.string().optional(),
        videoUrl: z.string().min(1).max(2000),
        title: z.string().max(200).optional().nullable(),
        thumbnail: z.string().max(2000).optional().nullable(),
        sortOrder: z.number().int().min(0).optional().nullable(),
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
        const lifecycle = safeString(searchParams.get('lifecycle')).toLowerCase()
        const developerId = safeString(searchParams.get('developerId'))
        const search = safeString(searchParams.get('search'))

        const where: any = {}
        if (status) where.status = status
        if (developerId) where.developerId = developerId
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { community: { contains: search, mode: 'insensitive' } },
                { developer: { is: { name: { contains: search, mode: 'insensitive' } } } },
            ]
        }
        if (lifecycle === 'deleted') {
            where.isDeleted = true
        } else if (lifecycle === 'archived') {
            where.isDeleted = false
            where.status = 'ARCHIVED'
        } else if (lifecycle === 'all') {
            // include all records
        } else {
            // default: active = non-deleted
            where.isDeleted = false
            if (!status) where.status = { in: ['DRAFT', 'PUBLISHED'] }
        }

        const [items, cityRows] = await Promise.all([
            (prisma as any).project.findMany({
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
                isDeleted: true,
                deletedAt: true,
                archivedAt: true,
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
            }),
            (prisma as any).project.findMany({
                where,
                select: { city: true },
                distinct: ['city'],
                orderBy: { city: 'asc' },
            }),
        ])
        const normalizedItems = await Promise.all((items || []).map(async (item: any) => {
            const hero = (item.media || []).find((m: any) => {
                const mt = String(m.mediaType || '').toLowerCase()
                const cat = String(m.category || '').toLowerCase()
                return mt === 'hero' || cat === 'hero'
            })?.mediaUrl
            const firstMedia = (item.media || []).find((m: any) => String(m.mediaUrl || '').trim())?.mediaUrl
            const imageReference = hero || item.coverImage || firstMedia || '/images/default-property.jpg'
            const heroImage = await resolveProjectMediaUrl(imageReference) || imageReference
            return {
                ...item,
                hero_image: heroImage,
                coverImage: heroImage,
                media: undefined,
            }
        }))

        const [total, active, archived, deleted] = await Promise.all([
            (prisma as any).project.count(),
            (prisma as any).project.count({ where: { isDeleted: false, status: { in: ['DRAFT', 'PUBLISHED'] } } }),
            (prisma as any).project.count({ where: { isDeleted: false, status: 'ARCHIVED' } }),
            (prisma as any).project.count({ where: { isDeleted: true } }),
        ])

        return NextResponse.json({
            success: true,
            items: normalizedItems,
            cityOptions: (cityRows || [])
                .map((row: any) => safeString(row.city))
                .filter(Boolean),
            lifecycleStats: { total, active, archived, deleted },
        })
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

        if (data.paymentPlans?.length) {
            const paymentPlans = data.paymentPlans as ProjectPaymentPlanItem[]
            await (prisma as any).projectPaymentPlan.createMany({
                data: paymentPlans.map((pp: ProjectPaymentPlanItem, idx: number) => {
                    const label = `${pp.label || ''}`.trim()
                    const amountRaw = pp.amount
                    const amountParsed = parseAEDInput(amountRaw as string | number | null)
                    const amount = amountParsed ?? (typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? amountRaw : parseFloat(`${amountRaw || '0'}`))
                    const currency = `${pp.currency || 'AED'}`.trim().toUpperCase() || 'AED'
                    const milestone = `${pp.milestone || ''}`.trim() || null
                    return {
                        projectId: project.id,
                        itemType: pp.itemType && String(pp.itemType).toLowerCase() === 'fee' ? 'FEE' : 'BASE_PRICE',
                        label,
                        amount,
                        currency,
                        milestone,
                        sortOrder: pp.sortOrder ?? idx,
                    }
                }),
            })
        }

        if (data.amenities?.length) {
            await (prisma as any).projectAmenity.createMany({
                data: data.amenities.map((a: any) => ({
                    projectId: project.id,
                    name: a.name?.trim() || '',
                    icon: a.icon?.trim() || null,
                    category: a.category?.trim() || null,
                })),
            })
        }

        if (data.nearbyPlaces?.length) {
            await (prisma as any).projectNearbyPlace.createMany({
                data: data.nearbyPlaces.map((np: any, idx: number) => ({
                    projectId: project.id,
                    name: np.name?.trim() || '',
                    category: np.category?.trim() || null,
                    distance: np.distance?.trim() || null,
                    sortOrder: np.sortOrder ?? idx,
                })),
            })
        }

        if (data.location) {
            await (prisma as any).projectLocation.create({
                data: {
                    projectId: project.id,
                    latitude: data.location.latitude ?? null,
                    longitude: data.location.longitude ?? null,
                    address: data.location.address?.trim() || null,
                    mapUrl: data.location.mapUrl?.trim() || null,
                },
            })
        }

        if (data.videos?.length) {
            await (prisma as any).projectVideo.createMany({
                data: data.videos.map((v: any, idx: number) => ({
                    projectId: project.id,
                    videoUrl: v.videoUrl?.trim() || '',
                    title: v.title?.trim() || null,
                    thumbnail: v.thumbnail?.trim() || null,
                    sortOrder: v.sortOrder ?? idx,
                })),
            })
        }

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

        if (data.floorPlans?.length) {
            await (prisma as any).projectFloorPlan.createMany({
                data: data.floorPlans.filter((fp: any) => String(fp.imageUrl || '').trim()).map((fp: any, idx: number) => ({
                    projectId: project.id,
                    unitVariantId: null,
                    unitType: fp.unitType?.trim() || 'Floor Plan',
                    bedrooms: fp.bedrooms ?? null,
                    bathrooms: fp.bathrooms ?? null,
                    size: fp.size?.trim() || null,
                    price: fp.price?.trim() || null,
                    imageUrl: fp.imageUrl?.trim() || null,
                })),
            })
        }

        return NextResponse.json({ success: true, project }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/projects]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
