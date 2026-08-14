import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { canonicalizePropertyImport, normalizeLocationPair } from '@/lib/propertyCanonical'
import { z } from 'zod'
import { CanonicalLocationError, validateCanonicalLocation } from '@/lib/canonicalLocation.server'

const propertyItemSchema = z.object({
    title: z.string().min(1).max(500),
    propertyType: z.string().max(100).optional().nullable(),
    intent: z.enum(['SALE', 'RENT']).optional().default('SALE'),
    price: z.number().nonnegative().optional().nullable(),
    currency: z.string().max(10).optional().default('INR'),
    constructionStatus: z.enum(['READY', 'OFF_PLAN']).optional().nullable(),
    shortDescription: z.string().max(5000).optional().nullable(),
    bedrooms: z.number().int().min(0).optional().default(0),
    bathrooms: z.number().int().min(0).optional().default(0),
    squareFeet: z.number().min(0).optional().default(0),
    countryCode: z.enum(['UAE', 'INDIA']).optional().default('INDIA'),
    countryIso2: z.string().max(2).optional().default('IN'),
    city: z.string().max(200).optional().nullable(),
    community: z.string().max(200).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    developerName: z.string().max(300).optional().nullable(),
    amenities: z.array(z.string()).optional().nullable(),
    paymentPlanText: z.string().max(2000).optional().nullable(),
    emiNote: z.string().max(1000).optional().nullable(),
    tour3dUrl: z.string().max(2000).optional().nullable(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SOLD', 'ARCHIVED']).optional().default('APPROVED'),
    sourceUrl: z.string().max(2000).optional().nullable(),
    sourceProvider: z.string().max(100).optional().nullable(),
    sourceListingId: z.string().max(300).optional().nullable(),
}).passthrough().superRefine((item, ctx) => {
    const casted = item as any
    if (casted.images !== undefined || casted.imageUrl !== undefined || casted.imageUrls !== undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['images'],
            message: 'Image URLs are not allowed in the canonical property import contract. Upload media through the property gallery workflow instead.',
        })
    }
    const canonical = canonicalizePropertyImport({ property: item, schemaVersion: 'property-import-v1' })
    if (!canonical.ok) {
        canonical.errors.forEach((error) => {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['property'],
                message: error,
            })
        })
    }
})

const bulkImportSchema = z.object({
    schemaVersion: z.literal('property-import-v1').optional(),
    systemAgentEmail: z.string().email().optional().default('admin@millionflats.com'),
    properties: z.array(propertyItemSchema).min(1).max(500),
})

function normalizePropertyImportBody(body: any) {
    const mergeEntry = (entry: any) => entry?.property
        ? {
            ...entry.property,
            sourceProvider: entry.source?.provider || entry.property.sourceProvider,
            sourceUrl: entry.source?.sourceUrl || entry.property.sourceUrl,
            sourceListingId: entry.source?.sourceListingId || entry.property.sourceListingId,
        }
        : entry

    if (body?.property) {
        return {
            schemaVersion: body.schemaVersion,
            systemAgentEmail: body.systemAgentEmail,
            properties: [mergeEntry(body)],
        }
    }

    if (Array.isArray(body?.properties)) {
        return {
            ...body,
            properties: body.properties.map(mergeEntry),
        }
    }

    return body
}

/** Find or create the system agent used for admin-created properties */
async function findOrCreateSystemAgent(email: string) {
    let user = await (prisma as any).user.findUnique({ where: { email } })

    if (!user) {
        user = await (prisma as any).user.create({
            data: {
                name: 'MillionFlats Admin',
                email,
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        })
    }

    let agent = await (prisma as any).agent.findUnique({ where: { userId: user.id } })

    if (!agent) {
        agent = await (prisma as any).agent.create({
            data: {
                userId: user.id,
                approved: true,
                profileStatus: 'LIVE',
                bio: 'MillionFlats system account for admin-imported properties',
                status: 'APPROVED',
            },
        })
    }

    return agent
}

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        // Accept the v1 single-property contract, v1 bulk entries, and legacy flat arrays.
        const normalizedBody = normalizePropertyImportBody(body)
        const parsed = bulkImportSchema.safeParse(normalizedBody)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { systemAgentEmail, properties } = parsed.data

        // Find or create system agent
        const systemAgent = await findOrCreateSystemAgent(systemAgentEmail)

        const results: { title: string; status: 'created' | 'skipped' | 'error'; reason?: string }[] = []

        for (const item of properties) {
            try {
                const location = normalizeLocationPair(item.countryCode || item.countryIso2 || 'India', item.city || 'Navi Mumbai', item.community || 'Kharghar')
                const verifiedLocation = await validateCanonicalLocation({ countryIso2: location.countryCode, city: location.city, community: location.community })
                const canonicalItem = {
                    ...item,
                    countryCode: verifiedLocation.countryCode,
                    countryIso2: verifiedLocation.countryIso2,
                    city: verifiedLocation.city,
                    community: verifiedLocation.community,
                }

                if (item.sourceProvider && item.sourceListingId) {
                    const existing = await (prisma as any).manualProperty.findFirst({ where: { sourceProvider: item.sourceProvider, sourceListingId: item.sourceListingId } })
                    if (existing) { results.push({ title: canonicalItem.title, status: 'skipped', reason: 'Duplicate source provider/listing ID' }); continue }
                }
                if (item.sourceUrl) {
                    const existing = await (prisma as any).manualProperty.findFirst({ where: { sourceUrl: item.sourceUrl } })
                    if (existing) { results.push({ title: canonicalItem.title, status: 'skipped', reason: 'Duplicate source URL' }); continue }
                }
                if (canonicalItem.title && canonicalItem.city) {
                    const existing = await (prisma as any).manualProperty.findFirst({
                        where: {
                            title: { equals: canonicalItem.title, mode: 'insensitive' },
                            city: { equals: canonicalItem.city, mode: 'insensitive' },
                        },
                    })
                    if (existing) {
                        results.push({ title: canonicalItem.title, status: 'skipped', reason: `Duplicate: "${canonicalItem.title}" in ${canonicalItem.city} already exists` })
                        continue
                    }
                }

                await (prisma as any).$transaction(async (tx: any) => {
                    const property = await tx.manualProperty.create({
                        data: {
                            agentId: systemAgent.id,
                            sourceType: 'MANUAL',
                            status: canonicalItem.status || 'APPROVED',
                            title: canonicalItem.title,
                            propertyType: canonicalItem.propertyType || null,
                            intent: canonicalItem.intent || 'SALE',
                            price: canonicalItem.price ?? null,
                            currency: canonicalItem.currency || 'INR',
                            constructionStatus: canonicalItem.constructionStatus || null,
                            shortDescription: canonicalItem.shortDescription || null,
                            bedrooms: canonicalItem.bedrooms || 0,
                            bathrooms: canonicalItem.bathrooms || 0,
                            squareFeet: canonicalItem.squareFeet || 0,
                            countryCode: canonicalItem.countryCode || 'INDIA',
                            countryIso2: canonicalItem.countryIso2 || 'IN',
                            city: canonicalItem.city || null,
                            community: canonicalItem.community || null,
                            address: canonicalItem.address || null,
                            latitude: canonicalItem.latitude ?? null,
                            longitude: canonicalItem.longitude ?? null,
                            developerName: canonicalItem.developerName || null,
                            amenities: canonicalItem.amenities || null,
                            paymentPlanText: canonicalItem.paymentPlanText || null,
                            emiNote: canonicalItem.emiNote || null,
                            tour3dUrl: canonicalItem.tour3dUrl || null,
                            submittedAt: new Date(),
                            sourceProvider: item.sourceProvider || null,
                            sourceUrl: item.sourceUrl || null,
                            sourceListingId: item.sourceListingId || null,
                        },
                    })
                })

                results.push({ title: canonicalItem.title, status: 'created' })
            } catch (err: any) {
                results.push({ title: item.title, status: 'error', reason: err.message || 'Unknown error' })
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const skipped = results.filter(r => r.status === 'skipped').length
        const errored = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            media: { status: 'manual_upload_required', message: 'Property data was imported. Upload gallery media manually after review.' },
            summary: { total: properties.length, created, skipped, errored },
            results,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/properties/bulk-import]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
