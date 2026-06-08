import { prisma } from '@/lib/prisma'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

export type RecommendedPartner = {
  id: string
  name: string
  slug: string
  logo: string | null
  coverImage: string | null
  shortDescription: string | null
  rating: number | null
  yearsExperience: number | null
  locationCoverage: string | null
  categorySlug: string
  categoryTitle: string
  isVerified: boolean
}

export type RecommendationGroup = {
  categorySlug: string
  categoryTitle: string
  headline: string
  description: string
  partners: RecommendedPartner[]
  directoryHref: string
}

type ContextKey = 'project' | 'property' | 'developer'

const CONTEXT_CATEGORIES: Record<
  ContextKey,
  { slug: EcosystemCategorySlug; headline: string; description: string }[]
> = {
  project: [
    {
      slug: 'interior-design-renovation',
      headline: 'Need Interior Design?',
      description: 'Connect with verified designers for your new home.',
    },
    {
      slug: 'home-loans-finance',
      headline: 'Finance Your Purchase',
      description: 'Compare lenders and get matched with finance partners.',
    },
    {
      slug: 'legal-documentation',
      headline: 'Legal & Documentation',
      description: 'Secure your transaction with verified legal experts.',
    },
  ],
  property: [
    {
      slug: 'interior-design-renovation',
      headline: 'Ready to Design Your Space?',
      description: 'Premium interior partners for post-purchase fit-outs.',
    },
    {
      slug: 'packers-movers',
      headline: 'Planning Your Move?',
      description: 'Verified packers and movers for a smooth relocation.',
    },
    {
      slug: 'property-management',
      headline: 'Property Management',
      description: 'Hand over keys to verified property managers.',
    },
  ],
  developer: [
    {
      slug: 'interior-design-renovation',
      headline: 'Design Partners for Buyers',
      description: 'Recommended interior experts for your homebuyers.',
    },
    {
      slug: 'smart-home-automation',
      headline: 'Smart Home Integration',
      description: 'Automation partners for premium project upgrades.',
    },
    {
      slug: 'vastu-feng-shui',
      headline: 'Vastu & Feng Shui',
      description: 'Consultants for harmony-focused home planning.',
    },
  ],
}

export async function getRecommendedPartners(
  categorySlug: string,
  options?: { limit?: number; city?: string }
): Promise<RecommendedPartner[]> {
  const limit = options?.limit ?? 1
  const city = options?.city?.trim()

  const category = await (prisma as any).ecosystemCategory.findUnique({
    where: { slug: categorySlug, isActive: true },
    select: { id: true, slug: true, title: true },
  })
  if (!category) return []

  const where: Record<string, unknown> = {
    categoryId: category.id,
    isActive: true,
    status: 'APPROVED',
    slug: { not: null },
  }

  if (city) {
    where.locationCoverage = { contains: city, mode: 'insensitive' }
  }

  let partners = await (prisma as any).ecosystemPartner.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { rating: 'desc' }],
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      coverImage: true,
      shortDescription: true,
      rating: true,
      yearsExperience: true,
      locationCoverage: true,
      isVerified: true,
    },
  })

  if (partners.length === 0 && city) {
    partners = await (prisma as any).ecosystemPartner.findMany({
      where: {
        categoryId: category.id,
        isActive: true,
        status: 'APPROVED',
        slug: { not: null },
      },
      orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { rating: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverImage: true,
        shortDescription: true,
        rating: true,
        yearsExperience: true,
        locationCoverage: true,
        isVerified: true,
      },
    })
  }

  return partners
    .filter((p: any) => p.slug)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      logo: p.logo,
      coverImage: p.coverImage,
      shortDescription: p.shortDescription,
      rating: typeof p.rating === 'number' ? p.rating : null,
      yearsExperience: typeof p.yearsExperience === 'number' ? p.yearsExperience : null,
      locationCoverage: p.locationCoverage,
      categorySlug: category.slug,
      categoryTitle: category.title,
      isVerified: Boolean(p.isVerified),
    }))
}

export async function getRecommendationsForContext(
  context: ContextKey,
  options?: { city?: string; partnersPerCategory?: number }
): Promise<RecommendationGroup[]> {
  const categories = CONTEXT_CATEGORIES[context] || []
  const partnersPerCategory = options?.partnersPerCategory ?? 1

  const groups = await Promise.all(
    categories.map(async (item) => {
      const cfg = getEcosystemCategoryConfig(item.slug)
      const partners = await getRecommendedPartners(item.slug, {
        limit: partnersPerCategory,
        city: options?.city,
      })

      return {
        categorySlug: item.slug,
        categoryTitle: cfg?.title || item.slug,
        headline: item.headline,
        description: item.description,
        partners,
        directoryHref: `/ecosystem-partners/${item.slug}#partners`,
      }
    })
  )

  return groups.filter((g) => g.partners.length > 0)
}
