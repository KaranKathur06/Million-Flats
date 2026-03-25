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

const updateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  slug: z.string().max(200).optional(),
  logo: z.string().max(2000).optional().nullable(),
  banner: z.string().max(2000).optional().nullable(),
  countryCode: z.enum(['UAE', 'INDIA']).optional(),
  city: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  isFeatured: z.boolean().optional(),
  featuredRank: z.number().int().min(0).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

// ─── GET single developer (admin) ──────────────────────────
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const baseSelect = {
      id: true, name: true, slug: true, logo: true, banner: true,
      countryCode: true, countryIso2: true, city: true,
      description: true, shortDescription: true, website: true,
      foundedYear: true, isFeatured: true, featuredRank: true,
      status: true, createdAt: true, updatedAt: true,
      _count: { select: { projects: true, properties: true } },
    }

    let developer: any
    try {
      developer = await (prisma as any).developer.findUnique({
        where: { id: params.id },
        select: { ...baseSelect, isDeleted: true },
      })
    } catch {
      // isDeleted column not migrated yet — select without it
      developer = await (prisma as any).developer.findUnique({
        where: { id: params.id },
        select: baseSelect,
      })
    }

    if (!developer) {
      return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, developer })
  } catch (err: any) {
    console.error('[GET /api/admin/developers/:id]', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}

// ─── PUT update developer ───────────────────────────────────
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await (prisma as any).developer.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
    }

    const data = parsed.data

    // Slug uniqueness check
    let finalSlug: string | undefined
    if (data.slug && data.slug !== existing.slug) {
      finalSlug = data.slug.trim()
      let counter = 1
      let candidate = finalSlug
      while (true) {
        const conflict = await (prisma as any).developer.findFirst({
          where: { slug: candidate, NOT: { id: params.id } },
        })
        if (!conflict) { finalSlug = candidate; break }
        candidate = `${finalSlug}-${counter}`
        counter++
      }
    } else if (data.name && data.name !== existing.name) {
      // Auto-regenerate slug on name change only if no slug explicitly provided
      if (!data.slug) {
        const proposed = slugify(data.name)
        let candidate = proposed
        let counter = 1
        while (true) {
          const conflict = await (prisma as any).developer.findFirst({
            where: { slug: candidate, NOT: { id: params.id } },
          })
          if (!conflict) { finalSlug = candidate; break }
          candidate = `${proposed}-${counter}`
          counter++
        }
      }
    }

    // Featured rank enforcement
    const isFeatured = data.isFeatured ?? existing.isFeatured
    let featuredRank = data.featuredRank ?? existing.featuredRank
    if (isFeatured && !featuredRank && featuredRank !== 0) {
      featuredRank = 99
    }

    const updatePayload: any = {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(finalSlug && { slug: finalSlug }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.banner !== undefined && { banner: data.banner }),
      ...(data.city !== undefined && { city: data.city?.trim() || null }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription?.trim() || null }),
      ...(data.website !== undefined && { website: data.website?.trim() || null }),
      ...(data.foundedYear !== undefined && { foundedYear: data.foundedYear }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      ...(data.featuredRank !== undefined && { featuredRank }),
      ...(data.status !== undefined && { status: data.status }),
    }

    if (data.countryCode !== undefined) {
      updatePayload.countryCode = data.countryCode
      updatePayload.countryIso2 = data.countryCode === 'INDIA' ? 'IN' : 'AE'
    }

    const updated = await (prisma as any).developer.update({
      where: { id: params.id },
      data: updatePayload,
      select: { id: true, name: true, slug: true, status: true },
    })

    return NextResponse.json({ success: true, developer: updated })
  } catch (err: any) {
    console.error('[PUT /api/admin/developers/:id]', err)
    return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
  }
}

// ─── DELETE soft-delete developer ──────────────────────────
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const existing = await (prisma as any).developer.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
    }

    // Soft delete: mark deleted, preserve all data
    try {
      await (prisma as any).developer.update({
        where: { id: params.id },
        data: { status: 'INACTIVE', isDeleted: true, deletedAt: new Date() },
      })
    } catch {
      // Fallback if isDeleted/deletedAt columns not yet migrated
      await (prisma as any).developer.update({
        where: { id: params.id },
        data: { status: 'INACTIVE' },
      })
    }

    return NextResponse.json({ success: true, message: 'Developer deleted (soft)' })
  } catch (err: any) {
    console.error('[DELETE /api/admin/developers/:id]', err)
    return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
  }
}
