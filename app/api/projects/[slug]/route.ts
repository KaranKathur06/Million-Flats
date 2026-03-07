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
            },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        // Double-check published status (in case findUnique doesn't filter on compound)
        if (project.status !== 'PUBLISHED') {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, project })
    } catch (err: any) {
        console.error('[GET /api/projects/[slug]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
