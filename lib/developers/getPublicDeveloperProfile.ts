import { prisma } from '@/lib/prisma'
import type { DeveloperProfileData } from '@/components/developer-profile/types'

function formatAED(value: number | null | undefined) {
  if (!value || value <= 0) return null
  return `AED ${Math.round(value).toLocaleString('en-US')}`
}

function mapCountry(code?: string | null) {
  if (code === 'INDIA') return 'India'
  return 'UAE'
}

const PUBLISHED_PROJECTS_SELECT = {
  where: { status: 'PUBLISHED' as const, isDeleted: false },
  orderBy: { updatedAt: 'desc' as const },
  select: {
    id: true,
    name: true,
    slug: true,
    city: true,
    startingPrice: true,
    completionYear: true,
    coverImage: true,
    goldenVisa: true,
  },
}

function mapDeveloperToProfile(developer: any, slug: string): DeveloperProfileData {
  const projects = Array.isArray(developer.projects) ? developer.projects : []
  const projectPrices = projects
    .map((item: any) => Number(item.startingPrice || 0))
    .filter((value: number) => value > 0)
  const minPrice = projectPrices.length > 0 ? Math.min(...projectPrices) : null
  const maxPrice = projectPrices.length > 0 ? Math.max(...projectPrices) : null

  const citySet = new Set<string>(
    projects.map((item: any) => String(item.city || '').trim()).filter(Boolean)
  )

  const foundedYear =
    developer.foundedYear ||
    (developer.createdAt ? new Date(developer.createdAt).getFullYear() : new Date().getFullYear())
  const experience = Math.max(1, new Date().getFullYear() - foundedYear)

  const primaryCity = developer.city || citySet.values().next().value || 'Dubai'
  const country = mapCountry(developer.countryCode)

  const description =
    developer.description ||
    `${developer.name} is known for premium residential developments built with a strong focus on trust, quality, and long-term value.

With a delivery-first approach, the brand has scaled across key micro-markets while maintaining construction standards and investor confidence.

From design-led communities to strategic launch locations, ${developer.name} continues to serve end-users and investors looking for reliable execution at scale.`

  const tagline =
    developer.shortDescription || 'Luxury communities crafted with trust, scale, and on-time delivery.'

  return {
    name: developer.name,
    slug: developer.slug || slug,
    logo: developer.logo || '/LOGO.jpeg',
    banner: developer.banner || projects[0]?.coverImage || '/HOMEPAGE.jpg',
    tagline,
    description,
    shortDescription: developer.shortDescription || null,
    city: primaryCity,
    country,
    founded_year: foundedYear,
    specialization: 'Luxury Residential / Mixed-Use / Commercial',
    website: developer.website || null,
    verified: true,
    headquarters: developer.headquarters || null,
    email: developer.email || null,
    phone: developer.phone || null,
    address: developer.address || null,
    brochureUrl: developer.brochureUrl || null,
    socialLinks: {
      facebook: developer.facebookUrl || null,
      instagram: developer.instagramUrl || null,
      linkedin: developer.linkedinUrl || null,
      youtube: developer.youtubeUrl || null,
    },
    customerRating: developer.customerRating || null,
    projectsDelivered: developer.projectsDelivered || null,
    countriesPresent: developer.countriesPresent || null,
    verixScore: developer.verixScore || null,
    stats: {
      projects: projects.length,
      cities: citySet.size || 1,
      experience,
      startingPriceRange:
        minPrice && maxPrice
          ? `${formatAED(minPrice)} - ${formatAED(maxPrice)}`
          : minPrice
            ? `${formatAED(minPrice)}+`
            : null,
    },
    projects: projects.map((project: any, index: number) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      image: project.coverImage || '/image-placeholder.svg',
      location: [project.city, country].filter(Boolean).join(', '),
      startingPrice: formatAED(project.startingPrice),
      status: project.completionYear ? `Handover ${project.completionYear}` : 'New Launch',
      tag: index === 0 ? 'Featured' : project.goldenVisa ? '3D Tour Available' : null,
    })),
    achievements: (developer.achievements || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description || null,
      imageUrl: a.imageUrl || null,
      awardDate: a.awardDate ? new Date(a.awardDate).toISOString() : null,
    })),
    faqs: (developer.faqs || []).map((f: any) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    })),
    gallery: (developer.gallery || []).map((g: any) => ({
      id: g.id,
      imageUrl: g.imageUrl,
      caption: g.caption || null,
      category: g.category || null,
    })),
  }
}

/** Tiered Prisma loads — avoids server crash when profile child tables/columns are missing in production. */
export async function getPublicDeveloperProfile(rawSlug: string): Promise<DeveloperProfileData | null> {
  const normalizedSlug = decodeURIComponent(String(rawSlug || '')).trim().toLowerCase()
  if (!normalizedSlug) return null

  const baseWhere = (withDeletedFilter: boolean) =>
    withDeletedFilter
      ? { slug: normalizedSlug, status: 'ACTIVE', isDeleted: false }
      : { slug: normalizedSlug, status: 'ACTIVE' }

  const attempts: Array<{ where: Record<string, unknown>; include?: Record<string, unknown> }> = [
    {
      where: baseWhere(true),
      include: {
        projects: PUBLISHED_PROJECTS_SELECT,
        achievements: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        gallery: { orderBy: { sortOrder: 'asc' } },
      },
    },
    {
      where: baseWhere(true),
      include: { projects: PUBLISHED_PROJECTS_SELECT },
    },
    { where: baseWhere(true) },
    { where: baseWhere(false), include: { projects: PUBLISHED_PROJECTS_SELECT } },
    { where: baseWhere(false) },
    // Slug partial match (e.g. /developers/damac → "DAMAC Properties")
    {
      where: {
        OR: [
          { slug: { contains: normalizedSlug, mode: 'insensitive' } },
          { name: { contains: normalizedSlug.replace(/-/g, ' '), mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
        isDeleted: false,
      },
      include: { projects: PUBLISHED_PROJECTS_SELECT },
    },
  ]

  for (const attempt of attempts) {
    try {
      const developer = await (prisma as any).developer.findFirst({
        where: attempt.where,
        include: attempt.include,
      })
      if (!developer) continue
      if (developer.status === 'INACTIVE' || developer.isDeleted) return null
      return mapDeveloperToProfile(developer, normalizedSlug)
    } catch (err) {
      console.warn('[getPublicDeveloperProfile] query attempt failed', {
        slug: normalizedSlug,
        err,
      })
    }
  }

  return null
}
