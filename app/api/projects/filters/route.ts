import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const [cityRows, developerRows] = await Promise.all([
            (prisma as any).project.findMany({
                where: {
                    status: 'PUBLISHED',
                    isDeleted: false,
                    city: { not: null },
                },
                select: { city: true },
                distinct: ['city'],
                orderBy: [{ city: 'asc' }],
            }),
            (prisma as any).project.findMany({
                where: {
                    status: 'PUBLISHED',
                    isDeleted: false,
                    developer: {
                        status: 'ACTIVE',
                        isDeleted: { not: true },
                    },
                },
                select: {
                    developer: {
                        select: { name: true },
                    },
                },
                distinct: ['developerId'],
            }),
        ])

        const cities = (Array.isArray(cityRows) ? cityRows : [])
            .map((r: any) => String(r?.city || '').trim())
            .filter(Boolean)

        const developers = (Array.isArray(developerRows) ? developerRows : [])
            .map((r: any) => String(r?.developer?.name || '').trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))

        return NextResponse.json(
            { success: true, cities, developers },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        )
    } catch (err) {
        console.error('[GET /api/projects/filters]', err)
        return NextResponse.json({ success: false, message: 'Unable to load project filters' }, { status: 500 })
    }
}



