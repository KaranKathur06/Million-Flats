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

const bulkDeveloperSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  slug: z.string().max(200).optional(),
  logo: z.string().max(2000).optional().nullable(),
  banner: z.string().max(2000).optional().nullable(),
  country: z.string().optional().nullable(),
  countryIso2: z.string().max(2).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  website: z.string().optional().nullable(),
  founded_year: z.number().int().min(1800).max(2100).optional().nullable(),
  is_featured: z.boolean().optional(),
  featured_rank: z.number().int().min(0).optional().nullable(),
  status: z.string().optional(),
  specialization: z.any().optional(), // Accept but normalize
})

const bulkPayloadSchema = z.object({
  developers: z.array(bulkDeveloperSchema).min(1, 'At least one developer is required').max(200, 'Maximum 200 developers per batch'),
})

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = bulkPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
          details: parsed.error.issues.map(i => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const devs = parsed.data.developers
    const results: { name: string; status: 'created' | 'skipped' | 'error'; slug?: string; reason?: string }[] = []

    // Fetch existing developer names + slugs in one query
    const existingDevs = await (prisma as any).developer.findMany({
      select: { name: true, slug: true },
    })
    const existingNames = new Set((existingDevs as any[]).map((d: any) => d.name.toLowerCase()))
    const existingSlugs = new Set((existingDevs as any[]).map((d: any) => d.slug?.toLowerCase()).filter(Boolean))

    for (const dev of devs) {
      try {
        // Skip duplicates
        if (existingNames.has(dev.name.trim().toLowerCase())) {
          results.push({ name: dev.name, status: 'skipped', reason: 'Name already exists' })
          continue
        }

        // Determine country
        const countryStr = (dev.country || '').trim().toUpperCase()
        const countryCode = countryStr === 'INDIA' || countryStr === 'IN' ? 'INDIA' : 'UAE'
        const countryIso2 = dev.countryIso2 || (countryCode === 'INDIA' ? 'IN' : 'AE')

        // Generate unique slug
        let slug = dev.slug?.trim() || slugify(dev.name)
        let slugBase = slug
        let counter = 1
        while (existingSlugs.has(slug.toLowerCase())) {
          slug = `${slugBase}-${counter}`
          counter++
        }

        const status = (dev.status || 'ACTIVE').toUpperCase()

        const created = await (prisma as any).developer.create({
          data: {
            name: dev.name.trim(),
            slug,
            logo: dev.logo || null,
            banner: dev.banner || null,
            countryCode,
            countryIso2,
            city: dev.city?.trim() || null,
            description: dev.description?.trim() || null,
            shortDescription: dev.short_description?.trim() || null,
            website: dev.website?.trim() || null,
            foundedYear: dev.founded_year || null,
            isFeatured: dev.is_featured ?? false,
            featuredRank: dev.featured_rank ?? null,
            status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          },
          select: { id: true, name: true, slug: true },
        })

        existingNames.add(dev.name.trim().toLowerCase())
        existingSlugs.add(slug.toLowerCase())

        results.push({ name: dev.name, status: 'created', slug: created.slug })
      } catch (err: any) {
        results.push({ name: dev.name, status: 'error', reason: err.message || 'Unknown error' })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      message: `Processed ${devs.length} developers: ${created} created, ${skipped} skipped, ${errors} errors`,
      summary: { total: devs.length, created, skipped, errors },
      results,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/developers/bulk]', err)
    return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
  }
}
