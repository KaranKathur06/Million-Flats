/**
 * ProjectListingService
 *
 * Manages project discovery & listing ordering with:
 * - Market Priority (global market ordering)
 * - City Priority (per-city ordering within market)
 * - Pin Priority (temporary top placement within city)
 * - Listing Priority (admin-curated order)
 * - Fallback (createdAt DESC, id ASC)
 *
 * CRITICAL CONSTRAINT: Market hierarchy is never overridden by other features.
 * E.g., pinning cannot move a project from India to above UAE market.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Ranking Algorithm (executed at database query level):
 *
 * 1. Market Priority ASC (UAE=1, India=2)
 * 2. City Priority ASC (Dubai=1 within UAE)
 * 3. Pin Priority ASC (if isPinned=true, ordered among pinned in city)
 * 4. Listing Priority ASC (admin-curated 1,2,3...)
 * 5. createdAt DESC (newer projects first)
 * 6. id ASC (stable tiebreaker)
 */

export type ProjectListingSort = 'recommended' | 'newest' | 'price-asc' | 'price-desc'

export interface ProjectListingOptions {
  /** Database filters to apply before sorting */
  where?: Prisma.ProjectWhereInput
  /** Sort mode: 'recommended' (default market/city/pin/listing order), 'newest', 'price-asc', 'price-desc' */
  sortBy?: ProjectListingSort
  /** Pagination */
  take?: number
  skip?: number
  /** Include project relations */
  include?: Prisma.ProjectInclude
}

/**
 * Caches market and city priorities to avoid repeated database queries
 * during ranking operations.
 */
interface PriorityCache {
  marketPriorities: Map<string, number>
  cityPriorities: Map<string, number> // Key: "AE|Dubai"
  ttl: number // Timestamp when cache expires
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let priorityCache: PriorityCache | null = null

/**
 * Get cached market priority or fetch from DB
 */
async function getMarketPriority(countryIso2: string): Promise<number | null> {
  // Check/refresh cache
  if (!priorityCache || Date.now() > priorityCache.ttl) {
    await refreshPriorityCache()
  }

  return priorityCache!.marketPriorities.get(countryIso2) || null
}

/**
 * Get cached city priority or fetch from DB
 */
async function getCityPriority(countryIso2: string, cityName: string): Promise<number | null> {
  // Check/refresh cache
  if (!priorityCache || Date.now() > priorityCache.ttl) {
    await refreshPriorityCache()
  }

  const key = `${countryIso2}|${cityName}`
  return priorityCache!.cityPriorities.get(key) || null
}

/**
 * Refresh priority cache from database
 */
async function refreshPriorityCache(): Promise<void> {
  const [markets, cities] = await Promise.all([
    prisma.marketPriority.findMany({
      where: { isActive: true },
    }),
    prisma.cityPriority.findMany({
      where: { isActive: true },
    }),
  ])

  const marketMap = new Map<string, number>()
  for (const m of markets) {
    marketMap.set(m.countryIso2, m.priority)
  }

  const cityMap = new Map<string, number>()
  for (const c of cities) {
    cityMap.set(`${c.countryIso2}|${c.cityName}`, c.priority)
  }

  priorityCache = {
    marketPriorities: marketMap,
    cityPriorities: cityMap,
    ttl: Date.now() + CACHE_TTL_MS,
  }
}

/**
 * Clear priority cache (call after updating market/city configurations)
 */
export async function clearPriorityCache(): Promise<void> {
  priorityCache = null
}

/**
 * Build orderBy clause for different sort modes
 */
function buildOrderBy(
  sortBy: ProjectListingSort = 'recommended'
): Prisma.ProjectOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'newest':
      return [{ createdAt: 'desc' }, { id: 'asc' }]

    case 'price-asc':
      return [
        { startingPrice: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ]

    case 'price-desc':
      return [
        { startingPrice: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ]

    case 'recommended':
    default:
      // Market → City → Pin → Listing → Fallback
      // Implemented via subquery that calculates effective priority
      return [
        // Note: Raw SQL subquery below in getProjectListing()
        // Here we return default fallback in case subquery isn't applied
        { createdAt: 'desc' },
        { id: 'asc' },
      ]
  }
}

/**
 * Get projects with intelligent listing order
 *
 * For 'recommended' sort mode, computes effective priority by:
 * 1. Looking up market priority (AE=1, IN=2, etc.)
 * 2. Looking up city priority (Dubai=1, Abu Dhabi=2, etc.)
 * 3. Applying pin priority if pinned
 * 4. Applying listing priority if set
 * 5. Falling back to createdAt DESC, id ASC
 *
 * IMPORTANT: This loads all matching projects and sorts in-memory to respect
 * the complex ranking algorithm. For large datasets, consider pagination.
 */
export async function getProjectListing(options: ProjectListingOptions) {
  const { where, sortBy = 'recommended', take, skip, include } = options

  // Build base where clause
  const baseWhere: Prisma.ProjectWhereInput = {
    status: 'PUBLISHED',
    isDeleted: false,
    ...where,
  }

  if (sortBy === 'recommended') {
    // For recommended sort, we need to apply complex ranking logic
    // Load all projects matching filter (with pagination for safety)
    const pageSize = take || 100
    const offset = skip || 0

    const allProjects = await prisma.project.findMany({
      where: baseWhere,
      include: {
        // Only include minimal relations
        developer: { select: { id: true, name: true } },
      },
    })

    // Refresh priority cache
    if (!priorityCache || Date.now() > priorityCache.ttl) {
      await refreshPriorityCache()
    }

    // Compute effective priority for each project and sort
    const projectsWithRank = await Promise.all(
      allProjects.map(async (p) => {
        const marketPrio = priorityCache!.marketPriorities.get(p.countryIso2 || '') || 999
        const cityKey = `${p.countryIso2}|${p.city}`
        const cityPrio = priorityCache!.cityPriorities.get(cityKey) || 999
        const pinPrio = p.isPinned ? (p.pinPriority ?? 999) : 999
        const listingPrio = p.listingPriority ?? 999

        return {
          ...p,
          _rankMarket: marketPrio,
          _rankCity: cityPrio,
          _rankPin: pinPrio,
          _rankListing: listingPrio,
          _rankCreatedAt: new Date(p.createdAt).getTime(),
          _rankId: p.id,
        }
      })
    )

    // Sort by computed priorities
    projectsWithRank.sort((a, b) => {
      if (a._rankMarket !== b._rankMarket) return a._rankMarket - b._rankMarket
      if (a._rankCity !== b._rankCity) return a._rankCity - b._rankCity
      if (a._rankPin !== b._rankPin) return a._rankPin - b._rankPin
      if (a._rankListing !== b._rankListing) return a._rankListing - b._rankListing
      if (a._rankCreatedAt !== b._rankCreatedAt) return b._rankCreatedAt - a._rankCreatedAt
      return a._rankId.localeCompare(b._rankId)
    })

    // Apply pagination
    const paginatedProjects = projectsWithRank.slice(offset, offset + pageSize)

    // Strip ranking fields before returning
    return paginatedProjects.map(({ _rankMarket, _rankCity, _rankPin, _rankListing, _rankCreatedAt, _rankId, ...p }) => p)
  }

  // For non-recommended sorts, use standard Prisma query
  const orderBy = buildOrderBy(sortBy)

  return prisma.project.findMany({
    where: baseWhere,
    orderBy,
    take,
    skip,
    include,
  })
}

/**
 * Update listing priority for multiple projects within a city scope
 *
 * CRITICAL: Validates that all projects are in the same city
 * to prevent accidental cross-city reordering.
 */
export async function reorderProjectsInCity(
  countryIso2: string,
  cityName: string,
  projectUpdates: Array<{ projectId: string; newPriority: number }>
): Promise<void> {
  // Validate all projects exist in the target city
  const projectIds = projectUpdates.map((u) => u.projectId)
  const projects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      countryIso2,
      city: cityName,
      isDeleted: false,
    },
    select: { id: true },
  })

  if (projects.length !== projectIds.length) {
    throw new Error(
      `Not all projects exist in city ${cityName}, ${countryIso2}. Expected ${projectIds.length}, found ${projects.length}`
    )
  }

  // Transactional update
  await prisma.$transaction(
    projectUpdates.map((update) =>
      prisma.project.update({
        where: { id: update.projectId },
        data: { listingPriority: update.newPriority },
      })
    )
  )

  // Invalidate cache
  await clearPriorityCache()
}

/**
 * Pin/unpin a project (temporary top placement)
 */
export async function setPinStatus(
  projectId: string,
  isPinned: boolean,
  pinPriority?: number
): Promise<void> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      isPinned,
      pinPriority: isPinned ? pinPriority ?? 1 : null,
    },
  })

  await clearPriorityCache()
}

/**
 * Get market configuration (for admin UI)
 */
export async function getMarketConfiguration() {
  return prisma.marketPriority.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })
}

/**
 * Get city configuration for a country (for admin UI)
 */
export async function getCityConfiguration(countryIso2: string) {
  return prisma.cityPriority.findMany({
    where: { countryIso2, isActive: true },
    orderBy: { priority: 'asc' },
  })
}

/**
 * Update market priority (admin operation)
 */
export async function updateMarketPriority(
  countryIso2: string,
  priority: number
): Promise<void> {
  await prisma.marketPriority.update({
    where: { countryIso2 },
    data: { priority },
  })

  await clearPriorityCache()
}

/**
 * Update city priority (admin operation)
 */
export async function updateCityPriority(
  countryIso2: string,
  cityName: string,
  priority: number
): Promise<void> {
  await prisma.cityPriority.update({
    where: {
      countryIso2_cityName: { countryIso2, cityName },
    },
    data: { priority },
  })

  await clearPriorityCache()
}

export default {
  getProjectListing,
  getMarketPriority,
  getCityPriority,
  reorderProjectsInCity,
  setPinStatus,
  getMarketConfiguration,
  getCityConfiguration,
  updateMarketPriority,
  updateCityPriority,
  clearPriorityCache,
}
