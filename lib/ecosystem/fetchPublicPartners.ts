import { prisma } from '@/lib/prisma'
import { isPrismaConnectionError } from '@/lib/prisma/errors'
import { buildPublicPartnerWhere } from '@/lib/ecosystem/partnerVisibility'

export type PublicPartnerListItem = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  coverImage: string | null
  shortDescription: string | null
  rating: number | null
  yearsExperience: number | null
  projectsCompleted: number | null
  locationCoverage: string | null
  pricingRange: string | null
  isFeatured: boolean
  isVerified: boolean
}

export type FetchPublicPartnersResult = {
  items: PublicPartnerListItem[]
  total: number
  page: number
  take: number
  hasMore: boolean
  dbUnavailable?: boolean
}

const PARTNER_SELECT = {
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
} as const

const EMPTY_RESULT = (page: number, take: number, dbUnavailable = false): FetchPublicPartnersResult => ({
  items: [],
  total: 0,
  page,
  take,
  hasMore: false,
  ...(dbUnavailable ? { dbUnavailable: true } : {}),
})

export type FetchPublicPartnersParams = {
  categorySlug: string
  page?: number
  take?: number
  featuredOnly?: boolean
  minRating?: number
  search?: string
  location?: string
  budget?: string
}

export async function fetchPublicPartners(params: FetchPublicPartnersParams): Promise<FetchPublicPartnersResult> {
  const page = Math.max(1, params.page ?? 1)
  const take = Math.min(48, Math.max(1, params.take ?? 12))
  const skip = (page - 1) * take

  const where: Record<string, unknown> = buildPublicPartnerWhere({
    category: { slug: params.categorySlug, isActive: true },
  })

  if (params.featuredOnly) where.isFeatured = true
  if (typeof params.minRating === 'number' && params.minRating > 0) {
    where.rating = { gte: params.minRating }
  }
  if (params.search?.trim()) {
    where.OR = [
      { name: { contains: params.search.trim(), mode: 'insensitive' } },
      { shortDescription: { contains: params.search.trim(), mode: 'insensitive' } },
    ]
  }
  if (params.location?.trim()) {
    where.locationCoverage = { contains: params.location.trim(), mode: 'insensitive' }
  }
  if (params.budget?.trim()) {
    where.pricingRange = { contains: params.budget.trim(), mode: 'insensitive' }
  }

  try {
    const [items, total] = await Promise.all([
      (prisma as any).ecosystemPartner.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'desc' }],
        take,
        skip,
        select: PARTNER_SELECT,
      }),
      (prisma as any).ecosystemPartner.count({ where }),
    ])

    const hasMore = skip + items.length < total

    return { items: items as PublicPartnerListItem[], total, page, take, hasMore }
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.error('[fetchPublicPartners] Database unavailable:', error)
      return EMPTY_RESULT(page, take, true)
    }
    throw error
  }
}
