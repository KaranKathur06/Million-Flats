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

const developerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  slug: z.string().max(200).optional(),
  logo: z.string().max(2000).optional().nullable(),
  banner: z.string().max(2000).optional().nullable(),
  countryIso2: z.string().max(2).optional().nullable(),
  countryCode: z.enum(['UAE', 'INDIA']).optional(),
  city: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  founded_year: z.number().int().min(1800).max(2100).optional().nullable(),
  isFeatured: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  featuredRank: z.number().int().min(0).optional().nullable(),
  featured_rank: z.number().int().min(0).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
})

function normalizeDevData(data: z.infer<typeof developerSchema>) {
  const countryIso2 = data.countryIso2 || (data.countryCode === 'INDIA' ? 'IN' : 'AE')
  const countryCode = data.countryCode || (countryIso2 === 'IN' ? 'INDIA' : 'UAE')
  const status = (data.status || 'ACTIVE').toUpperCase()

  return {
    name: data.name.trim(),
    logo: data.logo || null,
    banner: data.banner || null,
    countryCode,
    countryIso2,
    city: data.city?.trim() || null,
    description: data.description?.trim() || null,
    shortDescription: (data.shortDescription || data.short_description || '').trim() || null,
    website: data.website?.trim() || null,
    foundedYear: data.foundedYear || data.founded_year || null,
    isFeatured: data.isFeatured ?? data.is_featured ?? false,
    featuredRank: data.featuredRank ?? data.featured_rank ?? null,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  }
}

// ─── GET all developers (admin) ────────────────────────────
export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')?.toUpperCase() || undefined
    const country = searchParams.get('country')?.toUpperCase() || undefined

    const baseSelect = {
      id: true, name: true, slug: true, logo: true, banner: true,
      countryCode: true, countryIso2: true, city: true,
      shortDescription: true, website: true, foundedYear: true,
      isFeatured: true, featuredRank: true, status: true,
      createdAt: true, updatedAt: true,
      _count: { select: { projects: true, properties: true } },
    }

    const runQuery = async (withIsDeletedFilter: boolean) => {
      const where: any = {}
      if (withIsDeletedFilter) where.isDeleted = { not: true }
      if (status === 'ACTIVE' || status === 'INACTIVE') where.status = status
      if (country === 'UAE' || country === 'INDIA') where.countryCode = country
      return (prisma as any).developer.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        take: 500,
        select: baseSelect,
      })
    }

    let items: any[]
    try {
      // Try with isDeleted filter (requires migration to have run)
      items = await runQuery(true)
    } catch {
      // Column doesn't exist yet — fall back to no filter
      items = await runQuery(false)
    }

    return NextResponse.json({ success: true, items })
  } catch (err: any) {
    console.error('[GET /api/admin/developers]', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

// ─── POST create single developer ─────────────────────────
export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = developerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const normalized = normalizeDevData(parsed.data)
    const slug = body.slug?.trim() || slugify(parsed.data.name)

    // Check name uniqueness
    const existingName = await (prisma as any).developer.findUnique({ where: { name: normalized.name } })
    if (existingName) {
      return NextResponse.json({ success: false, message: 'Developer name already exists' }, { status: 409 })
    }

    // Ensure unique slug
    let finalSlug = slug
    let counter = 1
    while (true) {
      const existingSlug = await (prisma as any).developer.findUnique({ where: { slug: finalSlug } })
      if (!existingSlug) break
      finalSlug = `${slug}-${counter}`
      counter++
    }

    // Validate: if featured, rank is required
    if (normalized.isFeatured && !normalized.featuredRank && normalized.featuredRank !== 0) {
      normalized.featuredRank = 99
    }

    const developer = await (prisma as any).developer.create({
      data: {
        ...normalized,
        slug: finalSlug,
      },
      select: { id: true, name: true, slug: true, status: true },
    })

    return NextResponse.json({ success: true, developer }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/admin/developers]', err)
    return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
  }
}
