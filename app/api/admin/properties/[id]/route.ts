import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { CanonicalLocationError, validateCanonicalLocation } from '@/lib/canonicalLocation.server'
import { MANUAL_PROPERTY_PUBLIC_STATUS, normalizeManualPropertyStatus } from '@/lib/manualPropertyLifecycle'
import { applyManualPropertyAdminAction, revalidateManualPropertyPaths } from '@/lib/manualPropertyAdminLifecycle'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const bannedMediaFields = ['images', 'imageUrl', 'imageUrls']

const PropertyPatchSchema = z.object({
    title: z.string().trim().max(120).optional().nullable(),
    propertyType: z.string().trim().max(40).optional().nullable(),
    intent: z.enum(['SALE', 'RENT']).optional().nullable(),
    price: z.number().finite().min(0).optional().nullable(),
    currency: z.string().trim().max(10).optional().nullable(),
    constructionStatus: z.enum(['READY', 'OFF_PLAN']).optional().nullable(),
    shortDescription: z.string().trim().max(1000).optional().nullable(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    squareFeet: z.number().finite().min(0).max(200000).optional(),
    countryCode: z.enum(['UAE', 'INDIA']).optional(),
    countryIso2: z.enum(['IN', 'AE']).optional().nullable(),
    city: z.string().trim().max(80).optional().nullable(),
    community: z.string().trim().max(120).optional().nullable(),
    address: z.string().trim().max(200).optional().nullable(),
    latitude: z.number().finite().min(-90).max(90).optional().nullable(),
    longitude: z.number().finite().min(-180).max(180).optional().nullable(),
    developerName: z.string().trim().max(120).optional().nullable(),
    amenities: z.array(z.string().trim().min(1).max(80)).max(80).optional().nullable(),
    customAmenities: z.array(z.string().trim().min(1).max(80)).max(5).optional().nullable(),
    paymentPlanText: z.string().trim().max(2000).optional().nullable(),
    emiNote: z.string().trim().max(500).optional().nullable(),
    tour3dUrl: z.string().trim().max(500).optional().nullable(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SOLD', 'ARCHIVED']).optional(),
    reason: z.string().max(1000).optional(),
}).passthrough()

function getIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || null
    return req.headers.get('x-real-ip') || null
}

function lifecycleActionForTargetStatus(currentStatus: string, targetStatus: string) {
    const current = normalizeManualPropertyStatus(currentStatus)
    const target = normalizeManualPropertyStatus(targetStatus)
    if (target === MANUAL_PROPERTY_PUBLIC_STATUS) {
        return current === 'ARCHIVED' || current === 'SOLD' ? 'restore_published' : 'publish'
    }
    if (target === 'DRAFT') {
        if (current === MANUAL_PROPERTY_PUBLIC_STATUS) return 'unpublish'
        if (current === 'ARCHIVED' || current === 'REJECTED') return 'restore'
        return 'draft'
    }
    if (target === 'ARCHIVED') return 'archive'
    if (target === 'SOLD') return 'mark_sold'
    if (target === 'REJECTED') return 'reject'
    return null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const property = await (prisma as any).manualProperty.findUnique({
            where: { id: params.id },
            include: {
                agent: { select: { id: true, user: { select: { name: true, email: true, image: true, phone: true } } } },
                media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
                inquiries: { take: 10, orderBy: { createdAt: 'desc' } },
                moderationLogs: { take: 10, orderBy: { createdAt: 'desc' }, include: { admin: { select: { name: true, email: true } } } },
            },
        })

        if (!property) {
            return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, property })
    } catch (err: any) {
        console.error('[GET /api/admin/properties/[id]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const existing = await (prisma as any).manualProperty.findUnique({ where: { id: params.id } })
        if (!existing) {
            return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
        }

        if (bannedMediaFields.some((field) => body[field] !== undefined)) {
            return NextResponse.json({
                success: false,
                message: 'Image URLs are not accepted for properties. Use the categorized property gallery upload flow.',
            }, { status: 422 })
        }

        const parsed = PropertyPatchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
        }

        const allowedFields = [
            'title', 'propertyType', 'intent', 'price', 'currency',
            'constructionStatus', 'shortDescription', 'bedrooms', 'bathrooms',
            'squareFeet', 'countryCode', 'countryIso2', 'city', 'community',
            'address', 'latitude', 'longitude', 'developerName',
            'amenities', 'customAmenities', 'paymentPlanText', 'emiNote',
            'tour3dUrl', 'status',
        ]

        const data: any = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                data[field] = field === 'status' ? normalizeManualPropertyStatus(body[field]) : body[field]
            }
        }

        if (body.countryIso2 !== undefined || body.countryCode !== undefined || body.city !== undefined || body.community !== undefined) {
            const verifiedLocation = await validateCanonicalLocation({
                countryIso2: body.countryIso2 ?? existing.countryIso2,
                city: body.city ?? existing.city,
                community: body.community ?? existing.community,
            })
            data.countryCode = verifiedLocation.countryCode
            data.countryIso2 = verifiedLocation.countryIso2
            data.city = verifiedLocation.city
            data.community = verifiedLocation.community
        }

        const targetStatus = data.status
        const statusChanged = targetStatus !== undefined && targetStatus !== existing.status
        if (statusChanged) delete data.status

        let updated = existing
        if (Object.keys(data).length > 0) {
            updated = await (prisma as any).manualProperty.update({
                where: { id: params.id },
                data,
            })
            revalidateManualPropertyPaths(updated)
        }

        if (statusChanged) {
            const lifecycleAction = lifecycleActionForTargetStatus(String(existing.status || 'DRAFT'), String(targetStatus))
            if (lifecycleAction) {
                const result = await applyManualPropertyAdminAction({
                    propertyId: params.id,
                    action: lifecycleAction,
                    actorUserId: auth.userId,
                    ipAddress: getIp(req),
                    reason: body.reason || null,
                })
                if (!result.ok) {
                    return NextResponse.json({ success: false, message: result.message }, { status: result.status })
                }
                updated = result.property
            } else {
                updated = await (prisma as any).manualProperty.update({
                    where: { id: params.id },
                    data: { status: targetStatus },
                })
                revalidateManualPropertyPaths(updated)
            }
        }

        return NextResponse.json({ success: true, property: updated })
    } catch (err: any) {
        if (err instanceof CanonicalLocationError) {
            return NextResponse.json({ success: false, message: err.message }, { status: 422 })
        }
        console.error('[PATCH /api/admin/properties/[id]]', err)
        return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const { searchParams } = new URL(req.url)
        const permanent = searchParams.get('permanent') === 'true'

        const existing = await (prisma as any).manualProperty.findUnique({ where: { id: params.id } })
        if (!existing) {
            return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
        }

        if (permanent) {
            await (prisma as any).$transaction(async (tx: any) => {
                await tx.manualPropertyMedia.deleteMany({ where: { propertyId: params.id } })
                await tx.manualPropertyModerationLog.deleteMany({ where: { propertyId: params.id } })
                await tx.manualDuplicateOverrideLog.deleteMany({ where: { propertyId: params.id } })
                await tx.inquiry.deleteMany({ where: { propertyId: params.id } })
                await tx.manualProperty.delete({ where: { id: params.id } })
            })
            await writeAuditLog({
                entityType: 'MANUAL_PROPERTY',
                entityId: params.id,
                action: 'DRAFT_DELETED',
                performedByUserId: auth.userId,
                ipAddress: getIp(req),
                beforeState: existing,
                meta: { actor: 'admin', permanent: true },
            })
            revalidateManualPropertyPaths(existing)
            return NextResponse.json({ success: true, action: 'permanently_deleted' })
        }

        const result = await applyManualPropertyAdminAction({
            propertyId: params.id,
            action: 'archive',
            actorUserId: auth.userId,
            ipAddress: getIp(req),
        })
        if (!result.ok) {
            return NextResponse.json({ success: false, message: result.message }, { status: result.status })
        }
        return NextResponse.json({ success: true, action: 'archived' })
    } catch (err: any) {
        console.error('[DELETE /api/admin/properties/[id]]', err)
        return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
    }
}