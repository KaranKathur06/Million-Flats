import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
                    select: { id: true, mediaUrl: true, mediaType: true, sortOrder: true },
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
                    select: { id: true, unitType: true, bedrooms: true, size: true, price: true, imageUrl: true },
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

        return NextResponse.json({
            success: true,
            project: {
                ...project,
                highlights,
                similarProjects,
            },
        })
    } catch (err: any) {
        console.error('[GET /api/projects/[slug]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
