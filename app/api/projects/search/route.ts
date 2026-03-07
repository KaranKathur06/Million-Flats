import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const q = (searchParams.get('q') || '').trim()

        if (!q || q.length < 2) {
            return NextResponse.json({ success: true, projects: [], properties: [], agents: [] })
        }

        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))

        const projects = await (prisma as any).project.findMany({
            where: {
                status: 'PUBLISHED',
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { city: { contains: q, mode: 'insensitive' } },
                    { community: { contains: q, mode: 'insensitive' } },
                    { developer: { name: { contains: q, mode: 'insensitive' } } },
                ],
            },
            orderBy: [{ createdAt: 'desc' }],
            take: limit,
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                startingPrice: true,
                goldenVisa: true,
                coverImage: true,
                developer: { select: { id: true, name: true, slug: true } },
            },
        })

        return NextResponse.json({ success: true, projects })
    } catch (err: any) {
        console.error('[GET /api/projects/search]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
