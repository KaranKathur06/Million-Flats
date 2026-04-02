import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const FALLBACK_IMAGE = '/images/default-property.jpg'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24))
        const city = (searchParams.get('city') || '').trim()
        const developer = (searchParams.get('developer') || '').trim()
        const goldenVisa = searchParams.get('goldenVisa')
        const minPrice = parseFloat(searchParams.get('minPrice') || '') || undefined
        const maxPrice = parseFloat(searchParams.get('maxPrice') || '') || undefined
        const completionYear = parseInt(searchParams.get('completionYear') || '', 10) || undefined
        const featured = searchParams.get('featured') === 'true'

        const where: any = { status: 'PUBLISHED' }

        if (city) where.city = { contains: city, mode: 'insensitive' }
        if (developer) {
            where.developer = { name: { contains: developer, mode: 'insensitive' } }
        }
        if (goldenVisa === 'true') where.goldenVisa = true
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.startingPrice = {}
            if (minPrice !== undefined) where.startingPrice.gte = minPrice
            if (maxPrice !== undefined) where.startingPrice.lte = maxPrice
        }
        if (completionYear) where.completionYear = completionYear
        if (featured) where.isFeatured = true

        const [items, total] = await Promise.all([
            (prisma as any).project.findMany({
                where,
                orderBy: featured
                    ? [{ featuredOrder: 'asc' }, { createdAt: 'desc' }]
                    : [{ createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    city: true,
                    community: true,
                    description: true,
                    completionYear: true,
                    startingPrice: true,
                    goldenVisa: true,
                    coverImage: true,
                    isFeatured: true,
                    featuredOrder: true,
                    status: true,
                    createdAt: true,
                    developer: { select: { id: true, name: true, slug: true, logo: true } },
                    media: { orderBy: { sortOrder: 'asc' }, select: { mediaUrl: true, mediaType: true, category: true } },
                    unitTypes: {
                        select: {
                            id: true,
                            unitType: true,
                            bedrooms: true,
                            bathrooms: true,
                            sizeFrom: true,
                            sizeTo: true,
                            priceFrom: true,
                            variants: {
                                select: {
                                    id: true,
                                    price: true,
                                    availabilityStatus: true,
                                    availableUnitsCount: true,
                                },
                            },
                        },
                    },
                },
            }),
            (prisma as any).project.count({ where }),
        ])

        const normalizedItems = items.map((item: any) => {
            const heroMedia = (item.media || []).find((m: any) => {
                const mt = String(m?.mediaType || '').toLowerCase()
                const cat = String(m?.category || '').toLowerCase()
                return mt === 'hero' || cat === 'hero'
            })
            const firstMedia = (item.media || []).find((m: any) => String(m?.mediaUrl || '').trim())
            const heroImage = heroMedia?.mediaUrl || item.coverImage || firstMedia?.mediaUrl || FALLBACK_IMAGE

            const variantPrices = (item.unitTypes || [])
                .flatMap((ut: any) => (ut.variants || []).map((v: any) => v.price))
                .filter((v: any) => typeof v === 'number') as number[]
            const priceRange = variantPrices.length > 0
                ? { min: Math.min(...variantPrices), max: Math.max(...variantPrices) }
                : null

            return {
                ...item,
                heroImage,
                coverImage: heroImage,
                priceRange,
                media: undefined,
            }
        })

        return NextResponse.json({
            success: true,
            items: normalizedItems,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (err: any) {
        console.error('[GET /api/projects]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
