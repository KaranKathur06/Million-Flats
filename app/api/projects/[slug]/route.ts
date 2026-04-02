import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
const FALLBACK_IMAGE = '/images/default-property.jpg'

function normalizeMediaType(v: unknown) {
    return String(v || '').trim().toLowerCase()
}

function groupProjectMedia(rows: Array<{ mediaUrl?: string | null; mediaType?: string | null; category?: string | null; label?: string | null; sortOrder?: number | null }>) {
    const out = {
        hero: [] as any[],
        gallery: [] as any[],
        interior: [] as any[],
        exterior: [] as any[],
        amenities: [] as any[],
        lifestyle: [] as any[],
        floor_plans: [] as any[],
    }

    const clean = (rows || [])
        .filter((m) => String(m?.mediaUrl || '').trim())
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    for (const m of clean) {
        const mt = normalizeMediaType(m.mediaType)
        const cat = normalizeMediaType(m.category)
        const key = cat || mt
        const payload = { url: m.mediaUrl, title: m.label || null, orderIndex: m.sortOrder ?? 0 }
        if (key === 'hero') out.hero.push(payload)
        else if (key === 'gallery' || mt === 'featured') out.gallery.push(payload)
        else if (key === 'interior' || key === 'interiors') out.interior.push(payload)
        else if (key === 'exterior') out.exterior.push(payload)
        else if (key === 'amenities') out.amenities.push(payload)
        else if (key === 'lifestyle') out.lifestyle.push(payload)
        else if (key === 'floor_plan' || key === 'floor-plan' || key === 'floorplan') out.floor_plans.push(payload)
        else out.gallery.push(payload)
    }

    if (out.hero.length === 0) {
        const fallback = out.gallery[0] || out.exterior[0] || out.interior[0] || out.amenities[0] || out.lifestyle[0]
        out.hero.push(fallback || { url: FALLBACK_IMAGE, title: 'Default Property Image', orderIndex: 0 })
    }

    return out
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    try {
        const slug = (params.slug || '').trim()
        if (!slug) {
            return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 })
        }

        const project = await (prisma as any).project.findUnique({
            where: { slug, status: 'PUBLISHED' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                countryIso2: true,
                description: true,
                highlights: true,
                completionYear: true,
                startingPrice: true,
                goldenVisa: true,
                coverImage: true,
                status: true,
                createdAt: true,
                developer: { select: { id: true, name: true, slug: true, logo: true } },
                media: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, mediaUrl: true, mediaType: true, category: true, label: true, sortOrder: true },
                },
                unitTypes: {
                    select: { id: true, unitType: true, sizeFrom: true, sizeTo: true, priceFrom: true },
                },
                amenities: {
                    select: { id: true, name: true, icon: true, category: true },
                },
                paymentPlans: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, stage: true, percentage: true, milestone: true, sortOrder: true },
                },
                floorPlans: {
                    select: { id: true, unitType: true, bedrooms: true, bathrooms: true, size: true, price: true, imageUrl: true },
                },
                videos: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, videoUrl: true, title: true, thumbnail: true, sortOrder: true },
                },
                location: {
                    select: { id: true, latitude: true, longitude: true, address: true, mapUrl: true },
                },
                nearbyPlaces: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, name: true, category: true, distance: true, sortOrder: true },
                },
            },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        if (project.status !== 'PUBLISHED') {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        // Parse highlights JSON
        let highlights: string[] = []
        if (project.highlights) {
            try {
                highlights = JSON.parse(project.highlights)
            } catch {
                highlights = []
            }
        }

        // Fetch similar projects (same developer or same city, limited to 4)
        const similarProjects = await (prisma as any).project.findMany({
            where: {
                status: 'PUBLISHED',
                id: { not: project.id },
                OR: [
                    { developerId: project.developer?.id },
                    { city: project.city },
                ],
            },
            take: 4,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                startingPrice: true,
                goldenVisa: true,
                coverImage: true,
                developer: { select: { name: true } },
            },
        })

        const media = groupProjectMedia(project.media || [])
        const heroFallback = media.hero[0]?.url || project.coverImage || FALLBACK_IMAGE

        return NextResponse.json({
            success: true,
            project: {
                ...project,
                coverImage: heroFallback,
                highlights,
                similarProjects,
            },
            media,
            floor_plans: (project.floorPlans || []).map((fp: any) => ({
                id: fp.id,
                title: fp.unitType,
                image_url: fp.imageUrl || FALLBACK_IMAGE,
                size: fp.size || null,
                bedrooms: fp.bedrooms ?? null,
                bathrooms: fp.bathrooms ?? null,
                price: fp.price || null,
            })),
        })
    } catch (err: any) {
        console.error('[GET /api/projects/[slug]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
