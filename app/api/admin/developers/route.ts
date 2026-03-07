import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

const createDeveloperSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    logo: z.string().max(2000).optional(),
    countryIso2: z.string().max(2).optional(),
})

export async function GET(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const items = await (prisma as any).developer.findMany({
            orderBy: [{ name: 'asc' }],
            take: 500,
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                countryCode: true,
                countryIso2: true,
                isFeatured: true,
                createdAt: true,
                _count: { select: { projects: true, properties: true } },
            },
        })

        return NextResponse.json({ success: true, items })
    } catch (err: any) {
        console.error('[GET /api/admin/developers]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = createDeveloperSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const data = parsed.data
        const slug = data.slug || slugify(data.name)

        // Check uniqueness
        const existing = await (prisma as any).developer.findUnique({ where: { name: data.name } })
        if (existing) {
            return NextResponse.json({ success: false, message: 'Developer name already exists' }, { status: 409 })
        }

        const developer = await (prisma as any).developer.create({
            data: {
                name: data.name,
                slug,
                logo: data.logo || null,
                countryIso2: data.countryIso2 || null,
            },
            select: { id: true, name: true, slug: true },
        })

        return NextResponse.json({ success: true, developer }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/developers]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
