import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

function parsePriceToNumber(input: unknown): number | null {
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (typeof input !== 'string') return null

    const raw = input.trim().toUpperCase()
    if (!raw) return null

    const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(numeric)) return null

    if (raw.includes('B')) return numeric * 1_000_000_000
    if (raw.includes('M')) return numeric * 1_000_000
    if (raw.includes('K')) return numeric * 1_000
    return numeric
}

const unitTypeSchema = z.object({
    unitType: z.string().min(1),
    sizeFrom: z.number().int().min(0).optional().nullable(),
    sizeTo: z.number().int().min(0).optional().nullable(),
    priceFrom: z.number().min(0).optional().nullable(),
})

const legacyUnitTypeSchema = z.object({
    unitType: z.string().min(1),
    bedrooms: z.number().int().optional().nullable(),
    size: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
})

const amenitySchema = z.object({
    name: z.string().min(1),
    icon: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
})

const paymentPlanSchema = z.object({
    stage: z.string().min(1),
    percentage: z.number().min(0).max(100),
    milestone: z.string().optional().nullable(),
})

const floorPlanSchema = z.object({
    unitType: z.string().min(1),
    bedrooms: z.number().int().optional().nullable(),
    size: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
})

const nearbyPlaceSchema = z.object({
    name: z.string().min(1),
    category: z.string().optional().nullable(),
    distance: z.string().optional().nullable(),
})

const legacyConnectivitySchema = z.object({
    place: z.string().min(1),
    time: z.string().optional().nullable(),
})

const mediaStructuredSchema = z.object({
    hero: z.string().max(2000).optional().nullable(),
    featured: z.array(z.string().max(2000)).optional().nullable(),
    tabs: z.object({
        exterior: z.array(z.string().max(2000)).optional(),
        amenities: z.array(z.string().max(2000)).optional(),
        interiors: z.array(z.string().max(2000)).optional(),
        lifestyle: z.array(z.string().max(2000)).optional(),
    }).optional().nullable(),
}).optional().nullable()

const brochureSchema = z.object({
    title: z.string().max(300).optional().nullable(),
    file: z.string().max(2000).optional().nullable(),
}).optional().nullable()

const projectItemSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    city: z.string().max(200).optional().nullable(),
    community: z.string().max(200).optional().nullable(),
    countryIso2: z.string().max(2).optional().nullable(),
    goldenVisa: z.boolean().optional().default(false),
    completionYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startingPrice: z.number().min(0).optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('PUBLISHED'),
    description: z.string().max(50000).optional().nullable(),
    highlights: z.array(z.string()).optional().nullable(),
    coverImage: z.string().max(2000).optional().nullable(),
    sourceUrl: z.string().max(2000).optional().nullable(),
    amenities: z.array(z.union([amenitySchema, z.string().min(1)])).optional().nullable(),
    paymentPlans: z.array(paymentPlanSchema).optional().nullable(),
    paymentPlan: z.record(z.string(), z.string()).optional().nullable(),
    unitTypes: z.array(z.union([unitTypeSchema, z.string().min(1)])).optional().nullable(),
    startingPrices: z.record(z.string(), z.string()).optional().nullable(),
    floorPlans: z.array(floorPlanSchema).optional().nullable(),
    legacyFloorPlans: z.array(legacyUnitTypeSchema).optional().nullable(),
    nearbyPlaces: z.array(nearbyPlaceSchema).optional().nullable(),
    connectivity: z.array(legacyConnectivitySchema).optional().nullable(),
    locationAddress: z.string().max(5000).optional().nullable(),
    media: mediaStructuredSchema,
    brochure: brochureSchema,
})

const bulkImportSchema = z.object({
    developerSlug: z.string().min(1).max(200),
    developerName: z.string().min(1).max(300).optional(),
    projects: z.array(projectItemSchema).min(1).max(200),
})

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = bulkImportSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { developerSlug, developerName, projects } = parsed.data

        // Find or create developer
        let developer = await (prisma as any).developer.findUnique({ where: { slug: developerSlug } })
        if (!developer) {
            const name = developerName || developerSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            developer = await (prisma as any).developer.findUnique({ where: { name } })
            if (!developer) {
                developer = await (prisma as any).developer.create({
                    data: { name, slug: developerSlug, countryCode: 'UAE', countryIso2: 'AE' },
                })
            }
        }

        const results: { name: string; slug: string; status: 'created' | 'skipped' | 'error'; reason?: string }[] = []

        for (const item of projects) {
            try {
                const slug = item.slug || slugify(item.name)
                const existing = await (prisma as any).project.findUnique({ where: { slug } })
                if (existing) {
                    results.push({ name: item.name, slug, status: 'skipped', reason: 'Slug already exists' })
                    continue
                }

                const unitTypeRows: Array<{ unitType: string; sizeFrom: number | null; sizeTo: number | null; priceFrom: number | null }> = []
                for (const ut of item.unitTypes || []) {
                    if (typeof ut === 'string') {
                        const key = ut.trim()
                        if (!key) continue
                        const matchedPrice = item.startingPrices
                            ? Object.entries(item.startingPrices).find(([priceKey]) => {
                                const normalizedKey = priceKey.toLowerCase().replace(/\s+/g, '')
                                const normalizedType = key.toLowerCase().replace(/\s+/g, '')
                                return normalizedType.includes(normalizedKey) || normalizedKey.includes(normalizedType)
                            })?.[1]
                            : undefined
                        unitTypeRows.push({
                            unitType: key,
                            sizeFrom: null,
                            sizeTo: null,
                            priceFrom: parsePriceToNumber(matchedPrice),
                        })
                    } else {
                        unitTypeRows.push({
                            unitType: ut.unitType,
                            sizeFrom: ut.sizeFrom ?? null,
                            sizeTo: ut.sizeTo ?? null,
                            priceFrom: ut.priceFrom ?? null,
                        })
                    }
                }

                const amenityRows: Array<{ name: string; icon: string | null; category: string | null }> = []
                for (const a of item.amenities || []) {
                    if (typeof a === 'string') {
                        const name = a.trim()
                        if (!name) continue
                        amenityRows.push({ name, icon: null, category: null })
                    } else {
                        amenityRows.push({ name: a.name, icon: a.icon || null, category: a.category || null })
                    }
                }

                const paymentRows: Array<{ stage: string; percentage: number; milestone: string | null; sortOrder: number }> = []
                if (item.paymentPlans && item.paymentPlans.length > 0) {
                    item.paymentPlans.forEach((pp, idx) => {
                        paymentRows.push({
                            stage: pp.stage,
                            percentage: pp.percentage,
                            milestone: pp.milestone || null,
                            sortOrder: idx,
                        })
                    })
                } else if (item.paymentPlan) {
                    Object.entries(item.paymentPlan).forEach(([stageRaw, percentageRaw], idx) => {
                        const pct = parsePriceToNumber(percentageRaw)
                        if (pct === null) return
                        paymentRows.push({
                            stage: stageRaw.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
                            percentage: pct,
                            milestone: null,
                            sortOrder: idx,
                        })
                    })
                }

                const nearbyRows: Array<{ name: string; category: string | null; distance: string | null; sortOrder: number }> = []
                if (item.nearbyPlaces && item.nearbyPlaces.length > 0) {
                    item.nearbyPlaces.forEach((np, idx) => {
                        nearbyRows.push({
                            name: np.name,
                            category: np.category || null,
                            distance: np.distance || null,
                            sortOrder: idx,
                        })
                    })
                } else if (item.connectivity && item.connectivity.length > 0) {
                    item.connectivity.forEach((np, idx) => {
                        nearbyRows.push({
                            name: np.place,
                            category: null,
                            distance: np.time || null,
                            sortOrder: idx,
                        })
                    })
                }

                const mediaRows: Array<{ mediaUrl: string; mediaType: string; sortOrder: number }> = []
                if (item.media) {
                    let order = 0
                    if (item.media.hero) mediaRows.push({ mediaUrl: item.media.hero, mediaType: 'hero', sortOrder: order++ })
                    for (const url of item.media.featured || []) mediaRows.push({ mediaUrl: url, mediaType: 'featured', sortOrder: order++ })
                    for (const url of item.media.tabs?.exterior || []) mediaRows.push({ mediaUrl: url, mediaType: 'exterior', sortOrder: order++ })
                    for (const url of item.media.tabs?.amenities || []) mediaRows.push({ mediaUrl: url, mediaType: 'amenities', sortOrder: order++ })
                    for (const url of item.media.tabs?.interiors || []) mediaRows.push({ mediaUrl: url, mediaType: 'interiors', sortOrder: order++ })
                    for (const url of item.media.tabs?.lifestyle || []) mediaRows.push({ mediaUrl: url, mediaType: 'lifestyle', sortOrder: order++ })
                }
                if (item.brochure?.file) {
                    mediaRows.push({
                        mediaUrl: item.brochure.file,
                        mediaType: 'brochure',
                        sortOrder: mediaRows.length,
                    })
                }

                // Use Prisma transaction to insert everything atomically
                await (prisma as any).$transaction(async (tx: any) => {
                    const project = await tx.project.create({
                        data: {
                            name: item.name,
                            slug,
                            developerId: developer.id,
                            countryIso2: item.countryIso2 || 'AE',
                            city: item.city || null,
                            community: item.community || null,
                            description: item.description || null,
                            highlights: item.highlights ? JSON.stringify(item.highlights) : null,
                            completionYear: item.completionYear ?? null,
                            startingPrice: item.startingPrice ?? null,
                            goldenVisa: item.goldenVisa || false,
                            coverImage: item.coverImage || item.media?.hero || null,
                            status: item.status || 'PUBLISHED',
                        },
                    })

                    if (unitTypeRows.length > 0) {
                        await tx.projectUnitType.createMany({
                            data: unitTypeRows.map((ut) => ({
                                projectId: project.id,
                                unitType: ut.unitType,
                                sizeFrom: ut.sizeFrom,
                                sizeTo: ut.sizeTo,
                                priceFrom: ut.priceFrom,
                            })),
                        })
                    }

                    if (mediaRows.length > 0) {
                        await tx.projectMedia.createMany({
                            data: mediaRows.map((m) => ({
                                projectId: project.id,
                                mediaUrl: m.mediaUrl,
                                mediaType: m.mediaType,
                                sortOrder: m.sortOrder,
                            })),
                        })
                    }

                    // Amenities
                    if (amenityRows.length > 0) {
                        await tx.projectAmenity.createMany({
                            data: amenityRows.map((a) => ({
                                projectId: project.id,
                                name: a.name,
                                icon: a.icon || null,
                                category: a.category || null,
                            })),
                        })
                    }

                    // Payment plans
                    if (paymentRows.length > 0) {
                        await tx.projectPaymentPlan.createMany({
                            data: paymentRows.map((pp) => ({
                                projectId: project.id,
                                stage: pp.stage,
                                percentage: pp.percentage,
                                milestone: pp.milestone || null,
                                sortOrder: pp.sortOrder,
                            })),
                        })
                    }

                    // Floor plans
                    if (item.floorPlans && item.floorPlans.length > 0) {
                        await tx.projectFloorPlan.createMany({
                            data: item.floorPlans.map((fp: any) => ({
                                projectId: project.id,
                                unitType: fp.unitType,
                                bedrooms: fp.bedrooms ?? null,
                                size: fp.size || null,
                                price: fp.price || null,
                                imageUrl: fp.imageUrl || null,
                            })),
                        })
                    }

                    // Nearby places
                    if (nearbyRows.length > 0) {
                        await tx.projectNearbyPlace.createMany({
                            data: nearbyRows.map((np) => ({
                                projectId: project.id,
                                name: np.name,
                                category: np.category || null,
                                distance: np.distance || null,
                                sortOrder: np.sortOrder,
                            })),
                        })
                    }

                    // Location
                    if (item.locationAddress) {
                        await tx.projectLocation.create({
                            data: {
                                projectId: project.id,
                                address: item.locationAddress,
                            },
                        })
                    }
                })

                results.push({ name: item.name, slug, status: 'created' })
            } catch (err: any) {
                results.push({ name: item.name, slug: item.slug || slugify(item.name), status: 'error', reason: err.message || 'Unknown error' })
            }
        }

        const created = results.filter((r) => r.status === 'created').length
        const skipped = results.filter((r) => r.status === 'skipped').length
        const errored = results.filter((r) => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: { total: projects.length, created, skipped, errored },
            developer: { id: developer.id, name: developer.name, slug: developer.slug },
            results,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/projects/bulk-import]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
