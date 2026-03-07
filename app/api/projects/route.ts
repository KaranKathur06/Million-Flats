import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        const [items, total] = await Promise.all([
            (prisma as any).project.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
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
                    status: true,
                    createdAt: true,
                    developer: { select: { id: true, name: true, slug: true, logo: true } },
                    unitTypes: { select: { unitType: true, sizeFrom: true, sizeTo: true, priceFrom: true } },
                },
            }),
            (prisma as any).project.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            items,
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
