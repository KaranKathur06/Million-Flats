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

function toAgencyDisplayName(row: Record<string, unknown>) {
  const agencyName = typeof row.agencyName === 'string' && row.agencyName.trim() ? row.agencyName.trim() :
    typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Agency'
  return agencyName
}

function normalizeCountryLabel(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const normalized = raw.toUpperCase()
  if (normalized === 'IN' || normalized === 'INDIA') return 'India'
  if (normalized === 'AE' || normalized === 'UAE' || normalized === 'UNITED_ARAB_EMIRATES') return 'UAE'
  if (normalized === 'US' || normalized === 'USA' || normalized === 'UNITED_STATES') return 'USA'
  if (normalized === 'GB' || normalized === 'UK' || normalized === 'UNITED_KINGDOM') return 'UK'
  return raw
}

export function mergeAgencyDirectoryRows(
  profileRows: Array<Record<string, unknown>> = [],
  publicRows: Array<Record<string, unknown>> = [],
): PublicAgencyListItem[] {
  const merged = new Map<string, PublicAgencyListItem>()

  const getKey = (row: Record<string, unknown>) => {
    const name = toAgencyDisplayName(row).trim().toLowerCase()
    const country = String(normalizeCountryLabel(row.country ?? row.countryCode ?? row.countryIso2 ?? '') || 'unknown').trim().toLowerCase()
    return `${name}|${country}`
  }

  for (const row of [...profileRows, ...publicRows]) {
    const normalized = normalizeAgencyDirectoryRow(row)
    if (!normalized.agencyName) continue

    const key = getKey(row)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, normalized)
      continue
    }

    const shouldReplace =
      (!existing.slug && normalized.slug) ||
      (!existing.shortDescription && normalized.shortDescription) ||
      (!existing.logo && normalized.logo) ||
      (!existing.country && normalized.country) ||
      (!existing.city && normalized.city) ||
      (existing.isVerified === false && normalized.isVerified)

    if (shouldReplace) merged.set(key, normalized)
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured)
    return a.agencyName.localeCompare(b.agencyName)
  })
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

function normalizeAgencyDirectoryRow(row: Record<string, unknown>): PublicAgencyListItem {
  const agencyName = toAgencyDisplayName(row)
  const slugValue = typeof row.slug === 'string' && row.slug.trim() ? row.slug.trim() :
    typeof row.slug === 'number' ? String(row.slug) : null

  return {
    id: String(row.id || ''),
    agencyName,
    slug: slugValue,
    logo: buildAssetUrl((row.logo as string | null) ?? null) ?? MEDIA_FALLBACKS.developerLogo,
    banner:
      buildAssetUrl((row.banner as string | null) ?? null) ??
      buildAssetUrl((row.logo as string | null) ?? null) ??
      null,
    country: normalizeCountryLabel(row.country ?? row.countryCode ?? row.countryIso2 ?? null),
    city: row.city ? String(row.city) : null,
    shortDescription: row.shortDescription ? String(row.shortDescription) : null,
    specializations: Array.isArray(row.specializations)
      ? (row.specializations as string[])
      : [],
    isVerified: Boolean(row.isVerified ?? (row.onboardingStatus === 'APPROVED' || row.kycStatus === 'VERIFIED')),
    isFeatured: Boolean(row.isFeatured ?? false),
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

  const profileAttempts: Array<{ where: Record<string, unknown>; select: Record<string, unknown> }> = [
    { where, select: BASE_SELECT },
    {
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

  let profileRows: Record<string, unknown>[] = []

  for (const attempt of profileAttempts) {
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
      profileRows = rows as Record<string, unknown>[]
      if (profileRows.length > 0) break
    } catch (err) {
      console.warn('[getPublicAgencies] agency profile query attempt failed', err)
    }
  }

  try {
    const importedRows = await (prisma as any).agency.findMany({
      where: {
        ...(params.country ? { countryCode: params.country.toUpperCase() === 'UAE' ? 'UAE' : params.country.toUpperCase() === 'INDIA' ? 'INDIA' : undefined } : {}),
        isFeatured: params.sort === 'featured' ? true : undefined,
      },
      select: {
        id: true,
        name: true,
        countryCode: true,
        countryIso2: true,
        isFeatured: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take,
    })

    const merged = mergeAgencyDirectoryRows(profileRows, importedRows as Record<string, unknown>[])
    if (merged.length > 0) {
      return { agencies: merged.slice(0, take), total: merged.length }
    }
  } catch (err) {
    console.warn('[getPublicAgencies] agency table fallback query failed', err)
  }

  return {
    agencies: profileRows.map((row) => normalizeAgencyDirectoryRow(row)).slice(0, take),
    total: profileRows.length,
  }
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
