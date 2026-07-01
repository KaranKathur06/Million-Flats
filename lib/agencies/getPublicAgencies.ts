import { prisma } from '@/lib/prisma'
import { buildAssetUrl } from '@/lib/assetUrl'
import { MEDIA_FALLBACKS } from '@/lib/media/resolveMedia'

export type PublicAgencySort = 'featured' | 'newest' | 'most_active' | 'alphabetical'

export type GetPublicAgenciesParams = {
  country?: string
  search?: string
  sort?: PublicAgencySort
  limit?: number
}

export type PublicAgencyListItem = {
  id: string
  agencyName: string
  slug: string | null
  logo: string | null
  banner: string | null
  country: string | null
  city: string | null
  shortDescription: string | null
  specializations: string[]
  isVerified: boolean
  isFeatured: boolean
  yearEstablished: number | null
  totalListings: number
  totalClosedDeals: number
}

const BASE_SELECT = {
  id: true,
  agencyName: true,
  slug: true,
  logo: true,
  banner: true,
  country: true,
  city: true,
  shortDescription: true,
  specializations: true,
  isVerified: true,
  isFeatured: true,
  featuredRank: true,
  yearEstablished: true,
  totalListings: true,
  totalClosedDeals: true,
} as const

function buildWhere(params: GetPublicAgenciesParams) {
  const where: Record<string, unknown> = { onboardingStatus: 'APPROVED' }
  const country = (params.country || '').trim()
  if (country) where.country = { contains: country, mode: 'insensitive' }
  const search = (params.search || '').trim()
  if (search) where.agencyName = { contains: search, mode: 'insensitive' }
  return where
}

function buildOrderBy(sort: PublicAgencySort) {
  const orderByMap: Record<PublicAgencySort, Record<string, unknown>[]> = {
    featured: [{ isFeatured: 'desc' }, { featuredRank: 'asc' }, { agencyName: 'asc' }],
    newest: [{ createdAt: 'desc' }],
    most_active: [{ totalListings: 'desc' }, { totalClosedDeals: 'desc' }, { agencyName: 'asc' }],
    alphabetical: [{ agencyName: 'asc' }],
  }
  return orderByMap[sort] ?? orderByMap.featured
}

function normalizeRow(row: Record<string, unknown>): PublicAgencyListItem {
  return {
    id: String(row.id || ''),
    agencyName: String(row.agencyName || 'Agency'),
    slug: row.slug ? String(row.slug) : null,
    logo: buildAssetUrl(row.logo as string | null) ?? MEDIA_FALLBACKS.developerLogo,
    banner:
      buildAssetUrl(row.banner as string | null) ??
      buildAssetUrl(row.logo as string | null) ??
      null,
    country: row.country ? String(row.country) : null,
    city: row.city ? String(row.city) : null,
    shortDescription: row.shortDescription ? String(row.shortDescription) : null,
    specializations: Array.isArray(row.specializations)
      ? (row.specializations as string[])
      : [],
    isVerified: Boolean(row.isVerified),
    isFeatured: Boolean(row.isFeatured),
    yearEstablished:
      typeof row.yearEstablished === 'number' ? row.yearEstablished : null,
    totalListings:
      typeof row.totalListings === 'number' ? row.totalListings : 0,
    totalClosedDeals:
      typeof row.totalClosedDeals === 'number' ? row.totalClosedDeals : 0,
  }
}

/**
 * Public agency directory query — shared by /agencies page (SSR) and GET /api/agency/public.
 */
export async function getPublicAgencies(params: GetPublicAgenciesParams = {}) {
  const sort = params.sort ?? 'featured'
  const take = Math.min(Math.max(params.limit ?? 50, 1), 200)
  const where = buildWhere(params)
  const orderBy = buildOrderBy(sort)

  // Tiered fallback attempts so a schema column mismatch doesn't break the page
  const attempts: Array<{ where: Record<string, unknown>; select: Record<string, unknown> }> = [
    { where, select: BASE_SELECT },
    {
      // Drop country filter as last resort to at least return something
      where: { onboardingStatus: 'APPROVED' },
      select: {
        id: true,
        agencyName: true,
        slug: true,
        logo: true,
        banner: true,
        country: true,
        city: true,
        shortDescription: true,
        specializations: true,
        isVerified: true,
        isFeatured: true,
      },
    },
  ]

  for (const attempt of attempts) {
    const cleanWhere = Object.fromEntries(
      Object.entries(attempt.where).filter(([, v]) => v !== undefined)
    )
    try {
      const rows = await (prisma as any).agencyProfile.findMany({
        where: cleanWhere,
        orderBy,
        take,
        select: attempt.select,
      })
      return {
        agencies: (rows as Record<string, unknown>[]).map(normalizeRow),
        total: rows.length,
      }
    } catch (err) {
      console.warn('[getPublicAgencies] query attempt failed', err)
    }
  }

  return { agencies: [] as PublicAgencyListItem[], total: 0 }
}

export async function getPublicAgencyStats() {
  try {
    const [total, verified] = await Promise.all([
      (prisma as any).agencyProfile.count({ where: { onboardingStatus: 'APPROVED' } }),
      (prisma as any).agencyProfile.count({
        where: { onboardingStatus: 'APPROVED', isVerified: true },
      }),
    ])
    return { total: total ?? 0, verified: verified ?? 0, countries: 5 }
  } catch {
    return { total: 0, verified: 0, countries: 5 }
  }
}
