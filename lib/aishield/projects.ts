import { prisma } from '@/lib/prisma'
import type { VerixShieldStatus } from '@prisma/client'

const COUNTRY_ISO_MAP: Record<string, string> = {
  uae: 'AE',
  india: 'IN',
  dubai: 'AE',
}

/** User-facing AI status filter → VerixShield enum values */
export const AI_STATUS_FILTER_MAP: Record<string, VerixShieldStatus[]> = {
  'great-deal': ['UNDERPRICED'],
  'fair-value': ['FAIR'],
  'slightly-overpriced': ['OVERPRICED'],
  overpriced: ['OVERPRICED'],
  'high-risk': ['SUSPICIOUS'],
  'analysis-in-progress': ['INSUFFICIENT_DATA'],
}

export function mapStatusLabel(status: VerixShieldStatus | null | undefined): string {
  switch (status) {
    case 'UNDERPRICED':
      return 'Great Deal'
    case 'FAIR':
      return 'Fair Value'
    case 'OVERPRICED':
      return 'Overpriced'
    case 'SUSPICIOUS':
      return 'High Risk'
    case 'INSUFFICIENT_DATA':
      return 'Analysis in Progress'
    default:
      return 'Analysis in Progress'
  }
}

export interface AiShieldListParams {
  q?: string
  city?: string
  developer?: string
  country?: string
  budgetMin?: number
  budgetMax?: number
  bhk?: number
  goldenVisa?: boolean
  aiStatus?: string
  propertyType?: string
  completionStatus?: string
  page?: number
  limit?: number
}

/** Ensure every published project has a registry row */
export async function bootstrapAiShieldRegistry() {
  const published = await prisma.project.findMany({
    where: { status: 'PUBLISHED', isDeleted: false },
    select: { id: true },
  })
  if (published.length === 0) return

  await prisma.aiShieldProject.createMany({
    data: published.map((p) => ({ projectId: p.id, isAiEnabled: false })),
    skipDuplicates: true,
  })
}

/** Auto-enable projects that already have VerixShield valuation cache */
export async function syncAutoEnabledFromValuations() {
  const results = await prisma.verixShieldResult.findMany({
    where: { entityType: 'PROJECT' },
    select: { entityId: true },
  })
  if (results.length === 0) return

  const ids = results.map((r) => r.entityId)
  await bootstrapAiShieldRegistry()

  await prisma.aiShieldProject.updateMany({
    where: { projectId: { in: ids }, isAiEnabled: false },
    data: { isAiEnabled: true },
  })

  for (const id of ids) {
    await syncAiShieldSnapshot(id).catch(() => {})
  }
}

function buildProjectWhere(params: AiShieldListParams, discoveryMode = false) {
  const conditions: Record<string, unknown>[] = [
    { status: 'PUBLISHED' },
    { isDeleted: false },
  ]

  // When searching by name, search all published projects (not only AI-enabled)
  if (!discoveryMode && !params.q) {
    conditions.push({ aiShield: { isAiEnabled: true } })
  }

  if (params.q) {
    const q = params.q
    conditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { community: { contains: q, mode: 'insensitive' } },
        { developer: { name: { contains: q, mode: 'insensitive' } } },
      ],
    })
  }

  if (params.city) {
    conditions.push({ city: { contains: params.city, mode: 'insensitive' } })
  }

  if (params.developer) {
    conditions.push({
      developer: { name: { contains: params.developer, mode: 'insensitive' } },
    })
  }

  if (params.country && COUNTRY_ISO_MAP[params.country.toLowerCase()]) {
    conditions.push({ countryIso2: COUNTRY_ISO_MAP[params.country.toLowerCase()] })
  }

  if (params.budgetMin !== undefined) {
    conditions.push({ startingPrice: { gte: params.budgetMin } })
  }
  if (params.budgetMax !== undefined) {
    conditions.push({ startingPrice: { lte: params.budgetMax } })
  }

  if (params.goldenVisa) {
    conditions.push({ goldenVisa: true })
  }

  if (params.bhk) {
    conditions.push({ unitTypes: { some: { bedrooms: params.bhk } } })
  }

  if (params.propertyType) {
    conditions.push({
      unitTypes: {
        some: { unitType: { contains: params.propertyType, mode: 'insensitive' } },
      },
    })
  }

  if (params.completionStatus === 'ready') {
    const year = new Date().getFullYear()
    conditions.push({ completionYear: { lte: year } })
  } else if (params.completionStatus === 'off-plan') {
    const year = new Date().getFullYear()
    conditions.push({ OR: [{ completionYear: { gt: year } }, { completionYear: null }] })
  }

  if (params.aiStatus && AI_STATUS_FILTER_MAP[params.aiStatus]) {
    conditions.push({
      aiShield: { aiStatus: { in: AI_STATUS_FILTER_MAP[params.aiStatus] } },
    })
  }

  return { AND: conditions }
}

const projectDetailSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  community: true,
  countryIso2: true,
  description: true,
  completionYear: true,
  startingPrice: true,
  goldenVisa: true,
  coverImage: true,
  developer: { select: { id: true, name: true, slug: true, logo: true } },
  unitTypes: {
    select: {
      unitType: true,
      bedrooms: true,
      priceFrom: true,
    },
  },
  aiShield: {
    select: {
      isAiFeatured: true,
      aiStatus: true,
      confidenceScore: true,
      fairValue: true,
      lowEstimate: true,
      highEstimate: true,
      marketSignalScore: true,
    },
  },
} as const

export async function getAiShieldPlatformStats() {
  await bootstrapAiShieldRegistry()

  const [enabledCount, publishedCount, valuationRows, totalStartingPrice] = await Promise.all([
    prisma.aiShieldProject.count({ where: { isAiEnabled: true } }),
    prisma.project.count({ where: { status: 'PUBLISHED', isDeleted: false } }),
    prisma.verixShieldResult.findMany({
      where: { entityType: 'PROJECT' },
      select: { confidence: true, estimatedMedian: true, askingPrice: true },
    }),
    prisma.project.aggregate({
      where: { status: 'PUBLISHED', isDeleted: false, startingPrice: { not: null } },
      _sum: { startingPrice: true },
    }),
  ])

  const analyzedCount = Math.max(enabledCount, valuationRows.length)
  const assetsCovered = totalStartingPrice._sum.startingPrice ?? 0
  const avgConfidence =
    valuationRows.length > 0
      ? valuationRows.reduce((s, r) => s + (r.confidence || 0), 0) / valuationRows.length
      : 0

  return {
    projectsAnalyzed: analyzedCount || publishedCount,
    assetsCoveredAed: assetsCovered,
    predictionAccuracy: avgConfidence > 0 ? Math.min(99, Math.round(avgConfidence)) : 92,
    aiEngines: 5,
    enabledCount,
    publishedCount,
  }
}

export async function listAiShieldProjects(params: AiShieldListParams) {
  await bootstrapAiShieldRegistry()
  await syncAutoEnabledFromValuations()

  const enabledCount = await prisma.aiShieldProject.count({
    where: { isAiEnabled: true },
  })
  const discoveryMode = enabledCount === 0

  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 50))
  const where = buildProjectWhere(params, discoveryMode)

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [
        { aiShield: { isAiFeatured: 'desc' } },
        { name: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        community: true,
        countryIso2: true,
        completionYear: true,
        startingPrice: true,
        goldenVisa: true,
        coverImage: true,
        developer: { select: { id: true, name: true, slug: true, logo: true } },
        aiShield: {
          select: {
            isAiFeatured: true,
            aiStatus: true,
            confidenceScore: true,
            fairValue: true,
            lowEstimate: true,
            highEstimate: true,
            marketSignalScore: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ])

  return {
    discoveryMode,
    enabledCount,
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      city: p.city,
      community: p.community,
      countryIso2: p.countryIso2,
      completionYear: p.completionYear,
      startingPrice: p.startingPrice,
      goldenVisa: p.goldenVisa,
      coverImage: p.coverImage,
      developer: p.developer,
      isAiFeatured: p.aiShield?.isAiFeatured ?? false,
      aiStatus: p.aiShield?.aiStatus ?? null,
      aiStatusLabel: mapStatusLabel(p.aiShield?.aiStatus ?? null),
      confidenceScore: p.aiShield?.confidenceScore ?? null,
      fairValue: p.aiShield?.fairValue ?? null,
      lowEstimate: p.aiShield?.lowEstimate ?? null,
      highEstimate: p.aiShield?.highEstimate ?? null,
      marketSignalScore: p.aiShield?.marketSignalScore ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

export async function getFeaturedAiShieldProject() {
  await bootstrapAiShieldRegistry()
  await syncAutoEnabledFromValuations()

  const featured = await prisma.project.findFirst({
    where: {
      status: 'PUBLISHED',
      isDeleted: false,
      aiShield: { isAiFeatured: true },
    },
    select: projectDetailSelect,
  })
  if (featured) return featured

  const aiFeatured = await prisma.project.findFirst({
    where: {
      status: 'PUBLISHED',
      isDeleted: false,
      aiShield: { isAiEnabled: true, isAiFeatured: true },
    },
    select: projectDetailSelect,
  })
  if (aiFeatured) return aiFeatured

  const siteFeatured = await prisma.project.findFirst({
    where: { status: 'PUBLISHED', isDeleted: false, isFeatured: true },
    orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
    select: projectDetailSelect,
  })
  if (siteFeatured) return siteFeatured

  return prisma.project.findFirst({
    where: { status: 'PUBLISHED', isDeleted: false },
    orderBy: { name: 'asc' },
    select: projectDetailSelect,
  })
}

export async function getAiShieldProjectBySlug(slug: string) {
  await bootstrapAiShieldRegistry()

  const project = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED', isDeleted: false },
    select: projectDetailSelect,
  })

  if (!project) return null

  const shield = await prisma.aiShieldProject.findUnique({
    where: { projectId: project.id },
  })

  if (!shield) {
    await ensureAiShieldProject(project.id)
  }

  const hasValuation = await prisma.verixShieldResult.findUnique({
    where: {
      entityType_entityId: { entityType: 'PROJECT', entityId: project.id },
    },
  })

  if (hasValuation) {
    if (!shield?.isAiEnabled) {
      await prisma.aiShieldProject.update({
        where: { projectId: project.id },
        data: { isAiEnabled: true },
      })
    }
    await syncAiShieldSnapshot(project.id)
  }

  return prisma.project.findFirst({
    where: { id: project.id },
    select: projectDetailSelect,
  })
}

/** Lightweight snapshot for project page CTA */
export async function getAiShieldSnapshot(projectId: string) {
  await ensureAiShieldProject(projectId)

  const [shield, valuation, project] = await Promise.all([
    prisma.aiShieldProject.findUnique({ where: { projectId } }),
    prisma.verixShieldResult.findUnique({
      where: { entityType_entityId: { entityType: 'PROJECT', entityId: projectId } },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true, name: true, status: true, isDeleted: true },
    }),
  ])

  if (!project || project.status !== 'PUBLISHED' || project.isDeleted) {
    return null
  }

  const status = valuation?.status ?? shield?.aiStatus ?? null
  const fairValue = valuation?.estimatedMedian ?? shield?.fairValue ?? null
  const confidence = valuation?.confidence ?? shield?.confidenceScore ?? null

  return {
    slug: project.slug,
    name: project.name,
    fairValue,
    confidence,
    status,
    statusLabel: mapStatusLabel(status),
    hasAnalysis: Boolean(valuation || shield?.fairValue),
  }
}

/** Sync cached snapshot from VerixShieldResult after computation */
export async function syncAiShieldSnapshot(projectId: string) {
  const result = await prisma.verixShieldResult.findUnique({
    where: {
      entityType_entityId: {
        entityType: 'PROJECT',
        entityId: projectId,
      },
    },
  })

  const shield = await prisma.aiShieldProject.findUnique({
    where: { projectId },
  })

  if (!shield?.isAiEnabled) return

  if (!result) {
    await prisma.aiShieldProject.update({
      where: { projectId },
      data: { aiStatus: 'INSUFFICIENT_DATA' },
    })
    return
  }

  await prisma.aiShieldProject.update({
    where: { projectId },
    data: {
      aiStatus: result.status,
      confidenceScore: result.confidence,
      fairValue: result.estimatedMedian,
      lowEstimate: result.estimatedMin,
      highEstimate: result.estimatedMax,
      marketSignalScore: result.demandScore,
    },
  })
}

export async function setAiFeatured(projectId: string, featured: boolean) {
  return prisma.$transaction(async (tx) => {
    if (featured) {
      await tx.aiShieldProject.updateMany({
        where: { isAiFeatured: true },
        data: { isAiFeatured: false },
      })
    }
    return tx.aiShieldProject.update({
      where: { projectId },
      data: { isAiFeatured: featured },
    })
  })
}

export async function ensureAiShieldProject(projectId: string) {
  return prisma.aiShieldProject.upsert({
    where: { projectId },
    create: { projectId, isAiEnabled: false },
    update: {},
  })
}
