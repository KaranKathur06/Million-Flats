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
                amenities: {
                    select: { id: true, name: true, icon: true, category: true },
                },
            },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, amenities: project.amenities })
    } catch (err: any) {
        console.error('[GET /api/projects/[slug]/amenities]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}


