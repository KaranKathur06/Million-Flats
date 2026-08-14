import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { CanonicalLocationError, validateCanonicalLocation } from '@/lib/canonicalLocation.server'

const bannedMediaFields = ['images', 'imageUrl', 'imageUrls']

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
                data[field] = body[field]
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

        // Status change side effects
        if (data.status === 'APPROVED' && existing.status !== 'APPROVED') {
            data.submittedAt = data.submittedAt || new Date()
        }
        if (data.status === 'ARCHIVED') {
            data.archivedAt = new Date()
            data.archivedBy = auth.userId
        }

        const updated = await (prisma as any).manualProperty.update({
            where: { id: params.id },
            data,
        })

        // Log moderation action if status changed
        if (data.status && data.status !== existing.status) {
            const action = data.status === 'APPROVED' ? 'APPROVE' : 'REJECT'
            if (action === 'APPROVE' || action === 'REJECT') {
                await (prisma as any).manualPropertyModerationLog.create({
                    data: {
                        propertyId: params.id,
                        adminId: auth.userId,
                        action,
                        reason: body.reason || null,
                    },
                }).catch(() => { /* non-critical */ })
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
            // Hard delete — remove media first, then property
            await (prisma as any).$transaction(async (tx: any) => {
                await tx.manualPropertyMedia.deleteMany({ where: { propertyId: params.id } })
                await tx.manualPropertyModerationLog.deleteMany({ where: { propertyId: params.id } })
                await tx.manualDuplicateOverrideLog.deleteMany({ where: { propertyId: params.id } })
                await tx.inquiry.deleteMany({ where: { propertyId: params.id } })
                await tx.manualProperty.delete({ where: { id: params.id } })
            })
            return NextResponse.json({ success: true, action: 'permanently_deleted' })
        } else {
            // Soft delete — archive
            await (prisma as any).manualProperty.update({
                where: { id: params.id },
                data: { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: auth.userId },
            })
            return NextResponse.json({ success: true, action: 'archived' })
        }
    } catch (err: any) {
        console.error('[DELETE /api/admin/properties/[id]]', err)
        return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
    }
}
