import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  slug: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  take: z.coerce.number().int().min(1).max(48).default(12),
  featuredOnly: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  search: z.string().optional(),
  location: z.string().optional(),
  budget: z.string().optional(),
})

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = QuerySchema.parse({
      slug: searchParams.get('slug'),
      page: searchParams.get('page') ?? '1',
      take: searchParams.get('take') ?? '12',
      featuredOnly: searchParams.get('featuredOnly') ?? undefined,
      minRating: searchParams.get('minRating') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      budget: searchParams.get('budget') ?? undefined,
    })

    const category = await (prisma as any).ecosystemCategory.findUnique({
      where: { slug: parsed.slug },
      select: { id: true },
    })

    if (!category) return bad('Invalid category', 400)

    const skip = (parsed.page - 1) * parsed.take

    const where: any = {
      categoryId: category.id,
      isActive: true,
      status: 'APPROVED',
    }

    if (parsed.featuredOnly) where.isFeatured = true
    if (typeof parsed.minRating === 'number' && parsed.minRating > 0) {
      where.rating = { gte: parsed.minRating }
    }
    if (parsed.search?.trim()) {
      where.OR = [
        { name: { contains: parsed.search.trim(), mode: 'insensitive' } },
        { shortDescription: { contains: parsed.search.trim(), mode: 'insensitive' } },
      ]
    }
    if (parsed.location?.trim()) {
      where.locationCoverage = { contains: parsed.location.trim(), mode: 'insensitive' }
    }
    if (parsed.budget?.trim()) {
      where.pricingRange = { contains: parsed.budget.trim(), mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      (prisma as any).ecosystemPartner.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'desc' }],
        take: parsed.take,
        skip,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          coverImage: true,
          shortDescription: true,
          rating: true,
          yearsExperience: true,
          projectsCompleted: true,
          locationCoverage: true,
          pricingRange: true,
          isFeatured: true,
          isVerified: true,
        },
      }),
      (prisma as any).ecosystemPartner.count({ where }),
    ])

    const hasMore = skip + items.length < total

    return NextResponse.json({
      success: true,
      page: parsed.page,
      take: parsed.take,
      total,
      hasMore,
      items,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg.includes('Invalid')) return bad('Invalid query', 400)
    return bad(msg || 'Internal server error', 500)
  }
}
