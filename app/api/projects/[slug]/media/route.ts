import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    try {
        const slug = (params.slug || '').trim()
        if (!slug) {
            return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 })
        }

        const project = await (prisma as any).project.findFirst({
            where: { slug, status: 'PUBLISHED', isDeleted: false },
            select: {
                id: true,
                name: true,
                media: {
                    orderBy: { sortOrder: 'asc' },
                    select: { id: true, mediaUrl: true, mediaType: true, category: true, label: true, sortOrder: true },
                },
            },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, media: project.media })
    } catch (err: any) {
        console.error('[GET /api/projects/[slug]/media]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

