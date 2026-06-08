import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'
import { ECOSYSTEM_PARTNERS_CACHE_TAG } from '@/lib/ecosystem/revalidatePartner'

export const runtime = 'nodejs'
export const revalidate = 0

const QuerySchema = z.object({
  slug: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
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

/** Canonical public partner directory API — CMS single source of truth. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = QuerySchema.parse({
      slug: searchParams.get('slug') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      page: searchParams.get('page') ?? '1',
      take: searchParams.get('take') ?? '12',
      featuredOnly: searchParams.get('featuredOnly') ?? undefined,
      minRating: searchParams.get('minRating') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      budget: searchParams.get('budget') ?? undefined,
    })

    const categorySlug = parsed.slug || parsed.category
    if (!categorySlug) return bad('slug or category is required', 400)

    const result = await fetchPublicPartners({
      categorySlug,
      page: parsed.page,
      take: parsed.take,
      featuredOnly: parsed.featuredOnly,
      minRating: parsed.minRating,
      search: parsed.search,
      location: parsed.location,
      budget: parsed.budget,
    })

    return NextResponse.json(
      {
        success: true,
        page: result.page,
        take: result.take,
        total: result.total,
        hasMore: result.hasMore,
        items: result.items,
      },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'X-Cache-Tag': ECOSYSTEM_PARTNERS_CACHE_TAG,
        },
      }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    return bad(msg || 'Internal server error', 500)
  }
}
