import { prisma } from '@/lib/prisma'

export type PublicDeveloperSort =
  | 'featured'
  | 'most_projects'
  | 'newest'
  | 'oldest'
  | 'alphabetical'

export type GetPublicDevelopersParams = {
  country?: string
  featured?: boolean
  search?: string
  sort?: PublicDeveloperSort
  limit?: number
}

export type PublicDeveloperListItem = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  banner: string | null
  countryCode: string
  city: string | null
  shortDescription: string | null
  website: string | null
  foundedYear: number | null
  isFeatured: boolean
  featuredRank: number | null
  customerRating: number | null
  projectsDelivered: number | null
  countriesPresent: number | null
  verixScore: number | null
  _count: { projects: number; properties: number }
}

const BASE_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  banner: true,
  countryCode: true,
  city: true,
  shortDescription: true,
  website: true,
  foundedYear: true,
  isFeatured: true,
  featuredRank: true,
  customerRating: true,
  projectsDelivered: true,
  countriesPresent: true,
  verixScore: true,
} as const

function buildWhere(params: GetPublicDevelopersParams) {
  const where: Record<string, unknown> = { status: 'ACTIVE', isDeleted: false }
  const country = (params.country || '').toUpperCase()
  if (country === 'UAE' || country === 'INDIA') where.countryCode = country
  if (params.featured) where.isFeatured = true
  const search = (params.search || '').trim()
  if (search) where.name = { contains: search, mode: 'insensitive' }
  return where
}

function buildOrderBy(sort: PublicDeveloperSort) {
  const orderByMap: Record<PublicDeveloperSort, Record<string, unknown>[]> = {
    featured: [{ isFeatured: 'desc' }, { name: 'asc' }],
    most_projects: [{ projects: { _count: 'desc' } }, { name: 'asc' }],
    newest: [{ createdAt: 'desc' }],
    oldest: [{ createdAt: 'asc' }],
    alphabetical: [{ name: 'asc' }],
  }
  return orderByMap[sort] || orderByMap.featured
}

function normalizeRow(row: Record<string, unknown>): PublicDeveloperListItem {
  const count = (row._count as { projects?: number; properties?: number } | undefined) || {}
  return {
    ...(row as Omit<PublicDeveloperListItem, '_count'>),
    _count: {
      projects: typeof count.projects === 'number' ? count.projects : 0,
      properties: typeof count.properties === 'number' ? count.properties : 0,
    },
  }
}

/**
 * Public developer directory query — shared by /developers page (SSR) and GET /api/developers.
 * Uses tiered fallbacks so a simple count() can succeed while a heavy findMany would fail.
 */
export async function getPublicDevelopers(params: GetPublicDevelopersParams = {}) {
  const sort = params.sort || 'featured'
  const take = Math.min(Math.max(params.limit ?? 50, 1), 200)
  const where = buildWhere(params)
  const orderBy = buildOrderBy(sort)

  const attempts: Array<{ where: Record<string, unknown>; select: Record<string, unknown> }> = [
    {
      where,
      select: {
        ...BASE_SELECT,
        _count: { select: { projects: true, properties: true } },
      },
    },
    {
      where: { ...where, isDeleted: undefined },
      select: {
        ...BASE_SELECT,
        _count: { select: { projects: true, properties: true } },
      },
    },
    {
      where,
      select: { ...BASE_SELECT },
    },
  ]

  for (const attempt of attempts) {
    const cleanWhere = Object.fromEntries(
      Object.entries(attempt.where).filter(([, v]) => v !== undefined)
    )
    try {
      const rows = await (prisma as any).developer.findMany({
        where: cleanWhere,
        orderBy,
        take,
        select: attempt.select,
      })
      return {
        developers: (rows as Record<string, unknown>[]).map(normalizeRow),
        total: rows.length,
      }
    } catch (err) {
      console.warn('[getPublicDevelopers] query attempt failed', { sort, err })
    }
  }

  return { developers: [] as PublicDeveloperListItem[], total: 0 }
}

export async function getPublicDeveloperStats() {
  try {
    const [developerCount, projectCount, propertyCount] = await Promise.all([
      (prisma as any).developer.count({ where: { status: 'ACTIVE', isDeleted: false } }),
      (prisma as any).project.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
      (prisma as any).manualProperty.count({ where: { status: 'APPROVED' } }),
    ])
    return {
      developers: developerCount || 0,
      projects: projectCount || 0,
      properties: propertyCount || 0,
      countries: 2,
    }
  } catch {
    return { developers: 0, projects: 0, properties: 0, countries: 2 }
  }
}
