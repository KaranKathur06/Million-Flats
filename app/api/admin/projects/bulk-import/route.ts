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

const projectItemSchema = z.object({
    name: z.string().min(1).max(300),
    slug: z.string().min(1).max(200).optional(),
    city: z.string().max(200).optional().nullable(),
    community: z.string().max(200).optional().nullable(),
    countryIso2: z.string().max(2).optional().nullable(),
    goldenVisa: z.boolean().optional().default(false),
    completionYear: z.number().int().min(2000).max(2100).optional().nullable(),
    startingPrice: z.number().min(0).optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('PUBLISHED'),
    description: z.string().max(10000).optional().nullable(),
    coverImage: z.string().max(2000).optional().nullable(),
    sourceUrl: z.string().max(2000).optional().nullable(),
})

const bulkImportSchema = z.object({
    developerSlug: z.string().min(1).max(200),
    developerName: z.string().min(1).max(300).optional(),
    projects: z.array(projectItemSchema).min(1).max(200),
})

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = bulkImportSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { developerSlug, developerName, projects } = parsed.data

        // Find or create developer
        let developer = await (prisma as any).developer.findUnique({ where: { slug: developerSlug } })
        if (!developer) {
            // Try by name
            const name = developerName || developerSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            developer = await (prisma as any).developer.findUnique({ where: { name } })

            if (!developer) {
                // Create developer
                developer = await (prisma as any).developer.create({
                    data: {
                        name,
                        slug: developerSlug,
                        countryCode: 'UAE',
                        countryIso2: 'AE',
                    },
                })
            }
        }

        const results: { name: string; slug: string; status: 'created' | 'skipped' | 'error'; reason?: string }[] = []

        for (const item of projects) {
            try {
                const slug = item.slug || slugify(item.name)

                // Check if already exists
                const existing = await (prisma as any).project.findUnique({ where: { slug } })
                if (existing) {
                    results.push({ name: item.name, slug, status: 'skipped', reason: 'Slug already exists' })
                    continue
                }

                await (prisma as any).project.create({
                    data: {
                        name: item.name,
                        slug,
                        developerId: developer.id,
                        countryIso2: item.countryIso2 || 'AE',
                        city: item.city || null,
                        community: item.community || null,
                        description: item.description || null,
                        completionYear: item.completionYear ?? null,
                        startingPrice: item.startingPrice ?? null,
                        goldenVisa: item.goldenVisa || false,
                        coverImage: item.coverImage || null,
                        status: item.status || 'PUBLISHED',
                    },
                })

                results.push({ name: item.name, slug, status: 'created' })
            } catch (err: any) {
                results.push({ name: item.name, slug: item.slug || slugify(item.name), status: 'error', reason: err.message || 'Unknown error' })
            }
        }

        const created = results.filter((r) => r.status === 'created').length
        const skipped = results.filter((r) => r.status === 'skipped').length
        const errored = results.filter((r) => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: { total: projects.length, created, skipped, errored },
            developer: { id: developer.id, name: developer.name, slug: developer.slug },
            results,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/projects/bulk-import]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
