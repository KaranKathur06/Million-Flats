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
    amenities: z.array(amenitySchema).optional().nullable(),
    paymentPlans: z.array(paymentPlanSchema).optional().nullable(),
    floorPlans: z.array(floorPlanSchema).optional().nullable(),
    nearbyPlaces: z.array(nearbyPlaceSchema).optional().nullable(),
    locationAddress: z.string().max(5000).optional().nullable(),
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
                            coverImage: item.coverImage || null,
                            status: item.status || 'PUBLISHED',
                        },
                    })

                    // Amenities
                    if (item.amenities && item.amenities.length > 0) {
                        await tx.projectAmenity.createMany({
                            data: item.amenities.map((a: any) => ({
                                projectId: project.id,
                                name: a.name,
                                icon: a.icon || null,
                                category: a.category || null,
                            })),
                        })
                    }

                    // Payment plans
                    if (item.paymentPlans && item.paymentPlans.length > 0) {
                        await tx.projectPaymentPlan.createMany({
                            data: item.paymentPlans.map((pp: any, idx: number) => ({
                                projectId: project.id,
                                stage: pp.stage,
                                percentage: pp.percentage,
                                milestone: pp.milestone || null,
                                sortOrder: idx,
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
                    if (item.nearbyPlaces && item.nearbyPlaces.length > 0) {
                        await tx.projectNearbyPlace.createMany({
                            data: item.nearbyPlaces.map((np: any, idx: number) => ({
                                projectId: project.id,
                                name: np.name,
                                category: np.category || null,
                                distance: np.distance || null,
                                sortOrder: idx,
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
