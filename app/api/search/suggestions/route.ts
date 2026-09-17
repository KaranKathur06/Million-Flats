import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/suggestions?q=dam
 *
 * Returns grouped autocomplete suggestions:
 *   - projects  (name matches)
 *   - developers (name matches)
 *   - locations  (city / community matches)
 *
 * Triggered client-side after 1+ character.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const q = (searchParams.get('q') || '').trim()

        if (!q || q.length < 1) {
            return NextResponse.json({
                success: true,
                projects: [],
                developers: [],
                locations: [],
            })
        }

        const db = prisma as any

        // ── 1. Project name matches ────────────────────────────────────────
        const projectRows = await db.project.findMany({
            where: {
                status: 'PUBLISHED',
                isDeleted: false,
                name: { contains: q, mode: 'insensitive' },
            },
            orderBy: [
                { isFeatured: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 5,
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                coverImage: true,
                isFeatured: true,
                developer: { select: { name: true } },
            },
        })

        // ── 2. Developer name matches ──────────────────────────────────────
        const developerRows = await db.developer.findMany({
            where: {
                status: 'ACTIVE',
                isDeleted: false,
                name: { contains: q, mode: 'insensitive' },
            },
            orderBy: [
                { isFeatured: 'desc' },
                { name: 'asc' },
            ],
            take: 5,
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
            },
        })

        const propertyRows = await db.manualProperty.findMany({
            where: {
                status: 'PUBLISHED',
                sourceType: 'MANUAL',
                ...(searchParams.get('country') ? { countryCode: String(searchParams.get('country')).toUpperCase() } : {}),
                agent: { approved: true, user: { status: 'ACTIVE' } },
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { projectName: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { locality: { contains: q, mode: 'insensitive' } },
                    { community: { contains: q, mode: 'insensitive' } },
                ],
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: { id: true, title: true, projectName: true, city: true, community: true, countryCode: true },
        })

        // ── 3. Location matches (distinct cities + communities) ────────────
        const cityRows = await db.project.findMany({
            where: {
                status: 'PUBLISHED',
                isDeleted: false,
                city: { contains: q, mode: 'insensitive' },
            },
            select: { city: true },
            distinct: ['city'],
            take: 5,
        })

        const communityRows = await db.project.findMany({
            where: {
                status: 'PUBLISHED',
                isDeleted: false,
                community: { contains: q, mode: 'insensitive' },
            },
            select: { community: true, city: true },
            distinct: ['community'],
            take: 5,
        })

        // De-duplicate locations
        const locationSet = new Set<string>()
        const locations: { label: string; type: 'city' | 'community'; city?: string }[] = []

        for (const r of cityRows) {
            const c = String(r?.city || '').trim()
            if (c && !locationSet.has(c.toLowerCase())) {
                locationSet.add(c.toLowerCase())
                locations.push({ label: c, type: 'city' })
            }
        }

        for (const r of communityRows) {
            const com = String(r?.community || '').trim()
            const city = String(r?.city || '').trim()
            if (com && !locationSet.has(com.toLowerCase())) {
                locationSet.add(com.toLowerCase())
                locations.push({ label: com, type: 'community', city: city || undefined })
            }
        }

        return NextResponse.json(
            {
                success: true,
                projects: projectRows.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    city: p.city,
                    community: p.community,
                    coverImage: p.coverImage,
                    developer: p.developer?.name || null,
                    isFeatured: p.isFeatured,
                })),
                properties: propertyRows.map((p: any) => ({
                    id: p.id,
                    title: p.title || p.projectName || 'Property',
                    city: p.city,
                    community: p.community,
                    country: p.countryCode,
                })),
                developers: developerRows.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    slug: d.slug,
                    logo: d.logo,
                })),
                locations: locations.slice(0, 5),
            },
            {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            }
        )
    } catch (err: any) {
        console.error('[GET /api/search/suggestions]', err)
        return NextResponse.json(
            { success: false, message: 'Internal error' },
            { status: 500 }
        )
    }
}
