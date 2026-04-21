import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-property.jpg'

/**
 * GET /api/search/projects
 *
 * Unified search endpoint with weighted ranking, fuzzy matching, and filters.
 */

const COUNTRY_ISO_MAP: Record<string, string> = {
    uae: 'AE',
    india: 'IN',
    dubai: 'AE',
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const q = (searchParams.get('q') || '').trim()
        const city = (searchParams.get('city') || '').trim()
        const developer = (searchParams.get('developer') || '').trim()
        const budgetMin = parseFloat(searchParams.get('budget_min') || '') || undefined
        const budgetMax = parseFloat(searchParams.get('budget_max') || '') || undefined
        const bhk = parseInt(searchParams.get('bhk') || '', 10) || undefined
        const country = (searchParams.get('country') || '').trim().toLowerCase()
        const goldenVisa = searchParams.get('goldenVisa') === 'true'
        const featured = searchParams.get('featured') === 'true'
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24))

        const db = prisma as any

        // ── Build WHERE clause using AND array for safe composition ─────────
        const conditions: any[] = [
            { status: 'PUBLISHED' },
            { isDeleted: false },
        ]

        // Free-text search
        if (q) {
            conditions.push({
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { community: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { developer: { name: { contains: q, mode: 'insensitive' } } },
                ],
            })
        }

        // City filter
        if (city) {
            conditions.push({ city: { contains: city, mode: 'insensitive' } })
        }

        // Developer filter (separate AND condition to avoid conflict with OR)
        if (developer) {
            conditions.push({
                developer: { name: { contains: developer, mode: 'insensitive' } },
            })
        }

        // Country filter
        if (country && COUNTRY_ISO_MAP[country]) {
            conditions.push({ countryIso2: COUNTRY_ISO_MAP[country] })
        }

        // Budget range
        if (budgetMin !== undefined) {
            conditions.push({ startingPrice: { gte: budgetMin } })
        }
        if (budgetMax !== undefined) {
            conditions.push({ startingPrice: { lte: budgetMax } })
        }

        // Golden Visa
        if (goldenVisa) conditions.push({ goldenVisa: true })

        // Featured
        if (featured) conditions.push({ isFeatured: true })

        // BHK filter
        if (bhk) {
            conditions.push({ unitTypes: { some: { bedrooms: bhk } } })
        }

        const where = { AND: conditions }

        // ── Order — match the working /api/projects pattern ────────────────
        const orderBy = featured
            ? [{ featuredOrder: 'asc' as const }, { createdAt: 'desc' as const }]
            : [{ createdAt: 'desc' as const }]

        // ── Query ──────────────────────────────────────────────────────────
        const [items, total] = await Promise.all([
            db.project.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    countryIso2: true,
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
                    media: {
                        orderBy: { sortOrder: 'asc' },
                        take: 1,
                        select: { mediaUrl: true, mediaType: true, category: true },
                    },
                    unitTypes: {
                        select: {
                            id: true,
                            unitType: true,
                            bedrooms: true,
                            sizeFrom: true,
                            sizeTo: true,
                            priceFrom: true,
                        },
                    },
                },
            }),
            db.project.count({ where }),
        ])

        // ── Normalize + Rank ───────────────────────────────────────────────
        const qLower = q.toLowerCase()

        const results = items.map((item: any) => {
            // Resolve cover image
            const heroMedia = (item.media || []).find((m: any) => {
                const mt = String(m?.mediaType || '').toLowerCase()
                const cat = String(m?.category || '').toLowerCase()
                return mt === 'hero' || cat === 'hero'
            })
            const firstMedia = (item.media || []).find((m: any) => String(m?.mediaUrl || '').trim())
            const heroImage = heroMedia?.mediaUrl || item.coverImage || firstMedia?.mediaUrl || FALLBACK_IMAGE

            // Extract BHK options
            const bhkOptions = [...new Set(
                (item.unitTypes || [])
                    .map((ut: any) => ut.bedrooms)
                    .filter((b: any) => typeof b === 'number' && b > 0)
            )].sort((a: number, b: number) => a - b)

            // ── Weighted relevance score ──────────────────────────────────
            let score = 0
            if (q) {
                const name = String(item.name || '').toLowerCase()
                const devName = String(item.developer?.name || '').toLowerCase()
                const cityName = String(item.city || '').toLowerCase()
                const communityName = String(item.community || '').toLowerCase()

                if (name === qLower) score += 50
                else if (name.startsWith(qLower)) score += 30
                else if (name.includes(qLower)) score += 15

                if (devName === qLower) score += 40
                else if (devName.startsWith(qLower)) score += 25
                else if (devName.includes(qLower)) score += 10

                if (cityName === qLower) score += 30
                else if (cityName.includes(qLower)) score += 10
                if (communityName.includes(qLower)) score += 8
            }

            if (item.isFeatured) score += 20

            const ageMs = Date.now() - new Date(item.createdAt).getTime()
            const ageDays = ageMs / (1000 * 60 * 60 * 24)
            if (ageDays < 30) score += 10
            else if (ageDays < 90) score += 5

            return {
                id: item.id,
                name: item.name,
                slug: item.slug,
                countryIso2: item.countryIso2,
                city: item.city,
                community: item.community,
                description: item.description,
                completionYear: item.completionYear,
                startingPrice: item.startingPrice,
                goldenVisa: item.goldenVisa,
                coverImage: heroImage,
                isFeatured: item.isFeatured,
                status: item.status,
                createdAt: item.createdAt,
                developer: item.developer,
                bhkOptions,
                _score: score,
            }
        })

        // Sort by relevance if query present
        if (q) {
            results.sort((a: any, b: any) => b._score - a._score)
        }

        // ── Suggestions for no-result cases ────────────────────────────────
        let suggestions: string[] = []
        if (total === 0 && q) {
            const similar = await db.project.findMany({
                where: { status: 'PUBLISHED', isDeleted: false },
                orderBy: [{ createdAt: 'desc' }],
                take: 4,
                select: { name: true },
            })
            suggestions = similar.map((s: any) => s.name)
        }

        return NextResponse.json({
            success: true,
            results,
            total,
            totalPages: Math.ceil(total / limit),
            page,
            limit,
            filters_applied: {
                q: q || undefined,
                city: city || undefined,
                developer: developer || undefined,
                budget_min: budgetMin,
                budget_max: budgetMax,
                bhk: bhk,
                country: country || undefined,
                goldenVisa: goldenVisa || undefined,
                featured: featured || undefined,
            },
            suggestions,
        })
    } catch (err: any) {
        console.error('[GET /api/search/projects]', err?.message || err)
        return NextResponse.json(
            { success: false, message: 'Internal error' },
            { status: 500 }
        )
    }
}
