import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { canonicalizePropertyImport } from '@/lib/propertyCanonical'
import { CanonicalLocationError, validateCanonicalLocation } from '@/lib/canonicalLocation.server'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'

type LifecycleFilter = 'all' | 'active' | 'pending' | 'rejected' | 'sold' | 'archived'

export async function GET(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') || ''
        const lifecycle = (searchParams.get('lifecycle') || 'active') as LifecycleFilter
        const city = searchParams.get('city') || ''
        const propertyType = searchParams.get('propertyType') || ''
        const intent = searchParams.get('intent') || ''
        const agentId = searchParams.get('agentId') || ''
        const search = searchParams.get('search') || ''

        const where: any = {}

        // Status filter
        if (status) where.status = status

        // Lifecycle mapping
        switch (lifecycle) {
            case 'active':
                where.status = MANUAL_PROPERTY_PUBLIC_STATUS
                where.archivedAt = null
                break
            case 'pending':
                where.status = { in: ['DRAFT', 'PENDING_REVIEW'] }
                break
            case 'rejected':
                where.status = 'REJECTED'
                break
            case 'sold':
                where.status = 'SOLD'
                break
            case 'archived':
                where.status = 'ARCHIVED'
                break
            case 'all':
                // No status filter
                break
        }

        if (city) where.city = { contains: city, mode: 'insensitive' }
        if (propertyType) where.propertyType = { contains: propertyType, mode: 'insensitive' }
        if (intent) where.intent = intent
        if (agentId) where.agentId = agentId

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { community: { contains: search, mode: 'insensitive' } },
                { developerName: { contains: search, mode: 'insensitive' } },
            ]
        }

        const [items, total, active, pending, rejected, sold, archived] = await Promise.all([
            (prisma as any).manualProperty.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    agent: { select: { id: true, user: { select: { name: true, email: true, image: true } } } },
                    _count: { select: { media: true, inquiries: true } },
                },
                take: 200,
            }),
            (prisma as any).manualProperty.count({}),
            (prisma as any).manualProperty.count({ where: { status: MANUAL_PROPERTY_PUBLIC_STATUS, archivedAt: null } }),
            (prisma as any).manualProperty.count({ where: { status: { in: ['DRAFT', 'PENDING_REVIEW'] } } }),
            (prisma as any).manualProperty.count({ where: { status: 'REJECTED' } }),
            (prisma as any).manualProperty.count({ where: { status: 'SOLD' } }),
            (prisma as any).manualProperty.count({ where: { status: 'ARCHIVED' } }),
        ])

        return NextResponse.json({
            success: true,
            items,
            lifecycleStats: { total, active, pending, rejected, sold, archived },
        })
    } catch (err: any) {
        console.error('[GET /api/admin/properties]', err)
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
        const canonical = canonicalizePropertyImport({ property: body, schemaVersion: 'property-import-v1' })
        if (!canonical.ok) {
            return NextResponse.json({ success: false, message: canonical.errors.join(' ') }, { status: 400 })
        }
        if (body.images !== undefined || body.imageUrl !== undefined || body.imageUrls !== undefined) {
            return NextResponse.json({ success: false, message: 'Property image URLs are not accepted. Upload media after the property is created.' }, { status: 400 })
        }
        const normalized = canonical.normalized
        const hasLocationInput = [body.countryIso2, body.countryCode, body.city, body.community]
            .some((value) => typeof value === 'string' && value.trim().length > 0)
        const location = hasLocationInput ? await validateCanonicalLocation(normalized) : null

        // Find or create system agent
        const systemAgent = await findOrCreateSystemAgent()

        const property = await (prisma as any).$transaction(async (tx: any) => {
            const created = await tx.manualProperty.create({
                data: {
                    agentId: systemAgent.id,
                    sourceType: 'MANUAL',
                    status: 'DRAFT',
                    title: normalized.title?.trim() || null,
                    propertyType: normalized.propertyType || null,
                    intent: normalized.intent || null,
                    price: typeof body.price === 'number' ? body.price : null,
                    currency: body.currency || undefined,
                    constructionStatus: body.constructionStatus || null,
                    shortDescription: body.shortDescription || null,
                    bedrooms: body.bedrooms || 0,
                    bathrooms: body.bathrooms || 0,
                    squareFeet: body.squareFeet || 0,
                    ...(location ? {
                        countryCode: location.countryCode,
                        countryIso2: location.countryIso2,
                        city: location.city,
                        community: location.community,
                    } : {}),
                    address: body.address || null,
                    latitude: body.latitude || null,
                    longitude: body.longitude || null,
                    developerName: body.developerName || null,
                    amenities: body.amenities || null,
                    paymentPlanText: body.paymentPlanText || null,
                    emiNote: body.emiNote || null,
                    tour3dUrl: body.tour3dUrl || null,
                    submittedAt: null,
                },
            })

            return created
        })

        return NextResponse.json({ success: true, property })
    } catch (err: any) {
        if (err instanceof CanonicalLocationError) return NextResponse.json({ success: false, message: err.message }, { status: 422 })
        console.error('[POST /api/admin/properties]', err)
        return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
    }
}

/** Find or create the system agent used for admin-created properties */
async function findOrCreateSystemAgent() {
    const SYSTEM_EMAIL = 'admin@millionflats.com'

    // Check if system user + agent already exist
    let user = await (prisma as any).user.findUnique({ where: { email: SYSTEM_EMAIL } })

    if (!user) {
        user = await (prisma as any).user.create({
            data: {
                name: 'MillionFlats Admin',
                email: SYSTEM_EMAIL,
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
