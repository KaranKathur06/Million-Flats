import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'

const imageSchema = z.object({
    url: z.string().min(1).max(2000),
    category: z.enum(['COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO']).optional().default('EXTERIOR'),
})

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
    images: z.array(imageSchema).optional().nullable(),
})

const bulkImportSchema = z.object({
    systemAgentEmail: z.string().email().optional().default('admin@millionflats.com'),
    properties: z.array(propertyItemSchema).min(1).max(500),
})

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
        const parsed = bulkImportSchema.safeParse(body)
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
                // Deduplication check: title + city
                if (item.title && item.city) {
                    const existing = await (prisma as any).manualProperty.findFirst({
                        where: {
                            title: { equals: item.title, mode: 'insensitive' },
                            city: { equals: item.city, mode: 'insensitive' },
                        },
                    })
                    if (existing) {
                        results.push({ title: item.title, status: 'skipped', reason: `Duplicate: "${item.title}" in ${item.city} already exists` })
                        continue
                    }
                }

                await (prisma as any).$transaction(async (tx: any) => {
                    const property = await tx.manualProperty.create({
                        data: {
                            agentId: systemAgent.id,
                            sourceType: 'MANUAL',
                            status: item.status || 'APPROVED',
                            title: item.title,
                            propertyType: item.propertyType || null,
                            intent: item.intent || 'SALE',
                            price: item.price ?? null,
                            currency: item.currency || 'INR',
                            constructionStatus: item.constructionStatus || null,
                            shortDescription: item.shortDescription || null,
                            bedrooms: item.bedrooms || 0,
                            bathrooms: item.bathrooms || 0,
                            squareFeet: item.squareFeet || 0,
                            countryCode: item.countryCode || 'INDIA',
                            countryIso2: item.countryIso2 || 'IN',
                            city: item.city || null,
                            community: item.community || null,
                            address: item.address || null,
                            latitude: item.latitude ?? null,
                            longitude: item.longitude ?? null,
                            developerName: item.developerName || null,
                            amenities: item.amenities || null,
                            paymentPlanText: item.paymentPlanText || null,
                            emiNote: item.emiNote || null,
                            tour3dUrl: item.tour3dUrl || null,
                            submittedAt: new Date(),
                        },
                    })

                    // Create media records
                    if (Array.isArray(item.images) && item.images.length > 0) {
                        await tx.manualPropertyMedia.createMany({
                            data: item.images.map((img, idx) => ({
                                propertyId: property.id,
                                category: img.category || 'EXTERIOR',
                                url: img.url,
                                position: idx,
                            })),
                        })
                    }
                })

                results.push({ title: item.title, status: 'created' })
            } catch (err: any) {
                results.push({ title: item.title, status: 'error', reason: err.message || 'Unknown error' })
            }
        }

        const created = results.filter(r => r.status === 'created').length
        const skipped = results.filter(r => r.status === 'skipped').length
        const errored = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: { total: properties.length, created, skipped, errored },
            results,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/properties/bulk-import]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
