import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { parseAEDInput } from '@/lib/pricing'

function safeString(v: unknown) {
    return typeof v === 'string' ? v.trim() : ''
}

function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

const createProjectSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    developerId: z.string().min(1),
    countryIso2: z.string().max(2).optional(),
    city: z.string().max(200).optional(),
    community: z.string().max(200).optional(),
    description: z.string().max(10000).optional(),
    completionYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startingPrice: z.union([z.number(), z.string()]).optional().nullable(),
    goldenVisa: z.boolean().optional(),
    coverImage: z.string().max(2000).optional(),
    unitTypes: z
        .array(
            z.object({
                unitType: z.string().min(1).max(100),
                sizeFrom: z.number().int().min(0).optional().nullable(),
                sizeTo: z.number().int().min(0).optional().nullable(),
                priceFrom: z.union([z.number(), z.string()]).optional().nullable(),
            })
        )
        .optional(),
})

export async function GET(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const { searchParams } = new URL(req.url)
        const status = safeString(searchParams.get('status'))
        const developerId = safeString(searchParams.get('developerId'))

        const where: any = {}
        if (status) where.status = status
        if (developerId) where.developerId = developerId

        const items = await (prisma as any).project.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: 500,
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                startingPrice: true,
                goldenVisa: true,
                coverImage: true,
                status: true,
                completionYear: true,
                createdAt: true,
                updatedAt: true,
                developer: { select: { id: true, name: true, slug: true } },
                _count: { select: { media: true, unitTypes: true, leads: true } },
            },
        })

        return NextResponse.json({ success: true, items })
    } catch (err: any) {
        console.error('[GET /api/admin/projects]', err)
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
        const parsed = createProjectSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const data = parsed.data
        const slug = data.slug || slugify(data.name)
        const normalizedStartingPrice = parseAEDInput(data.startingPrice)
        if (data.startingPrice !== undefined && data.startingPrice !== null && normalizedStartingPrice === null) {
            return NextResponse.json({ success: false, message: 'Invalid startingPrice. Use values like 2160000, 2.16M, 750K.' }, { status: 400 })
        }

        // Check slug uniqueness
        const existing = await (prisma as any).project.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ success: false, message: 'Slug already exists' }, { status: 409 })
        }

        // Check developer exists
        const developer = await (prisma as any).developer.findUnique({ where: { id: data.developerId } })
        if (!developer) {
            return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
        }

        const project = await (prisma as any).project.create({
            data: {
                name: data.name,
                slug,
                developerId: data.developerId,
                countryIso2: data.countryIso2 || null,
                city: data.city || null,
                community: data.community || null,
                description: data.description || null,
                completionYear: data.completionYear ?? null,
                startingPrice: normalizedStartingPrice ?? null,
                goldenVisa: data.goldenVisa || false,
                coverImage: data.coverImage || null,
                status: 'DRAFT',
                unitTypes: data.unitTypes?.length
                    ? {
                        create: data.unitTypes.map((ut) => ({
                            unitType: ut.unitType,
                            sizeFrom: ut.sizeFrom ?? null,
                            sizeTo: ut.sizeTo ?? null,
                            priceFrom: parseAEDInput(ut.priceFrom) ?? null,
                        })),
                    }
                    : undefined,
            },
            select: { id: true, slug: true },
        })

        return NextResponse.json({ success: true, project }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/projects]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
