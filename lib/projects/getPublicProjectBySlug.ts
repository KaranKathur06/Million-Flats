import { prisma } from '@/lib/prisma'
import { buildAssetUrl } from '@/lib/assetUrl'
import { resolveDeveloperLogo, resolveProjectImage } from '@/lib/media/resolveMedia'

/** Shared select shape — matches GET /api/projects/[slug] (production-verified). */
export const publicProjectDetailSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  community: true,
  countryIso2: true,
  description: true,
  highlights: true,
  completionYear: true,
  startingPrice: true,
  goldenVisa: true,
  coverImage: true,
  brochureUrl: true,
  status: true,
  createdAt: true,
  developer: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
    },
  },
  media: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      mediaUrl: true,
      mediaType: true,
      category: true,
      label: true,
      sortOrder: true,
    },
  },
  unitTypes: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      unitType: true,
      bedrooms: true,
      bathrooms: true,
      sizeFrom: true,
      sizeTo: true,
      priceFrom: true,
      variants: {
        orderBy: { sortOrder: 'asc' as const },
        select: {
          id: true,
          title: true,
          size: true,
          price: true,
          pricePerSqft: true,
          availabilityStatus: true,
          availableUnitsCount: true,
          priceOnRequest: true,
          floorPlans: {
            orderBy: { createdAt: 'asc' as const },
            select: {
              id: true,
              unitType: true,
              bedrooms: true,
              bathrooms: true,
              size: true,
              price: true,
              imageUrl: true,
            },
          },
          media: {
            orderBy: { sortOrder: 'asc' as const },
            select: { id: true, type: true, url: true, title: true, sortOrder: true },
          },
        },
      },
    },
  },
  amenities: {
    select: { id: true, name: true, icon: true, category: true },
  },
  paymentPlans: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, stage: true, percentage: true, milestone: true, sortOrder: true },
  },
  floorPlans: {
    select: {
      id: true,
      unitType: true,
      bedrooms: true,
      bathrooms: true,
      size: true,
      price: true,
      imageUrl: true,
    },
  },
  videos: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, videoUrl: true, title: true, thumbnail: true, sortOrder: true },
  },
  location: {
    select: { id: true, latitude: true, longitude: true, address: true, mapUrl: true },
  },
  nearbyPlaces: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, name: true, category: true, distance: true, sortOrder: true },
  },
} as const

function parseHighlights(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function loadBrochure(projectId: string, brochureUrl: string | null | undefined) {
  if (brochureUrl) {
    return { file: brochureUrl }
  }

  try {
    const row = await (prisma as any).projectBrochure.findUnique({
      where: { projectId },
      select: { fileUrl: true, fileName: true, fileSize: true },
    })
    if (row?.fileUrl) {
      return {
        file: row.fileUrl,
        fileName: row.fileName,
        fileSize: row.fileSize,
      }
    }
  } catch (err) {
    console.error('[getPublicProjectBySlug] brochure lookup failed', { projectId, err })
  }

  return null
}

async function loadDeveloperProjectCount(developerId: string | undefined) {
  if (!developerId) return 0
  try {
    return await (prisma as any).project.count({
      where: { developerId, status: 'PUBLISHED', isDeleted: false },
    })
  } catch {
    return 0
  }
}

export async function getPublicProjectBySlug(rawSlug: string) {
  const slug = decodeURIComponent(String(rawSlug || '')).trim()
  if (!slug) return null

  try {
    const project = await (prisma as any).project.findFirst({
      where: { slug, status: 'PUBLISHED', isDeleted: false },
      select: publicProjectDetailSelect,
    })

    if (!project) return null

    const [brochure, publishedProjectCount, similarProjects] = await Promise.all([
      loadBrochure(project.id, project.brochureUrl),
      loadDeveloperProjectCount(project.developer?.id),
      (prisma as any).project
        .findMany({
          where: {
            status: 'PUBLISHED',
            isDeleted: false,
            id: { not: project.id },
            OR: [{ developerId: project.developer?.id }, { city: project.city }],
          },
          take: 4,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            community: true,
            startingPrice: true,
            goldenVisa: true,
            coverImage: true,
            developer: { select: { name: true } },
          },
        })
        .catch(() => []),
    ])

    const developer = project.developer
      ? {
          ...project.developer,
          logo: resolveDeveloperLogo(project.developer.logo),
          _count: { projects: publishedProjectCount },
        }
      : null

    const resolvedCover = resolveProjectImage({
      coverImage: project.coverImage,
      media: project.media,
    })

    return {
      ...project,
      coverImage: resolvedCover,
      highlights: parseHighlights(project.highlights),
      mediaStructured: null,
      brochure,
      developer,
      similarProjects: (similarProjects as any[]).map((sp) => ({
        ...sp,
        coverImage: sp.coverImage ? buildAssetUrl(sp.coverImage) || sp.coverImage : sp.coverImage,
      })),
    }
  } catch (err) {
    console.error('[getPublicProjectBySlug]', { slug, err })
    return null
  }
}
