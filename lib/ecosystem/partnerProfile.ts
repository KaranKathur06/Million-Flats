import { prisma } from '@/lib/prisma'
import { PUBLIC_PARTNER_VISIBILITY } from '@/lib/ecosystem/partnerVisibility'
import type {
  PartnerFaqItem,
  PartnerGalleryItem,
  PartnerLocationItem,
  PartnerPortfolioItem,
  PartnerProcessStep,
  PartnerProfileData,
  PartnerReviewItem,
  PartnerServiceItem,
  PartnerWhyChooseItem,
} from '@/components/partner-profile/types'

function parseJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function parseImages(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v) => typeof v === 'string' && v.trim())
}

export async function getPartnerProfile(
  categorySlug: string,
  partnerSlug: string
): Promise<PartnerProfileData | null> {
  const normalizedCategory = decodeURIComponent(categorySlug || '').trim().toLowerCase()
  const normalizedPartner = decodeURIComponent(partnerSlug || '').trim().toLowerCase()
  if (!normalizedCategory || !normalizedPartner) return null

  const partner = await (prisma as any).ecosystemPartner.findFirst({
    where: {
      slug: normalizedPartner,
      ...PUBLIC_PARTNER_VISIBILITY,
      category: { slug: normalizedCategory, isActive: true },
    },
    include: {
      category: { select: { slug: true, title: true } },
      services: { orderBy: { sortOrder: 'asc' } },
      locations: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      gallery: { orderBy: { sortOrder: 'asc' } },
      portfolios: { orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { isApproved: true },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      },
      faqs: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!partner) return null

  const whyChoose = parseJsonArray<PartnerWhyChooseItem>(partner.whyChoose)
  const workProcess = parseJsonArray<PartnerProcessStep>(partner.workProcess)

  const services: PartnerServiceItem[] = (partner.services || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description || null,
  }))

  const locations: PartnerLocationItem[] = (partner.locations || []).map((l: any) => ({
    id: l.id,
    city: l.city,
    region: l.region || null,
    isPrimary: Boolean(l.isPrimary),
  }))

  const portfolios: PartnerPortfolioItem[] = (partner.portfolios || []).map((p: any) => ({
    id: p.id,
    projectName: p.projectName,
    location: p.location || null,
    projectSize: p.projectSize || null,
    completionDate: p.completionDate || null,
    style: p.style || null,
    budgetRange: p.budgetRange || null,
    projectType: p.projectType || null,
    description: p.description || null,
    coverImage: p.coverImage || '/image-placeholder.svg',
    images: parseImages(p.images),
  }))

  const reviews: PartnerReviewItem[] = (partner.reviews || []).map((r: any) => ({
    id: r.id,
    reviewerName: r.reviewerName,
    location: r.location || null,
    projectType: r.projectType || null,
    review: r.review,
    rating: typeof r.rating === 'number' ? r.rating : null,
  }))

  const faqs: PartnerFaqItem[] = (partner.faqs || []).map((f: any) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
  }))

  const gallery: PartnerGalleryItem[] = (partner.gallery || []).map((g: any) => ({
    id: g.id,
    imageUrl: g.imageUrl,
    caption: g.caption || null,
    category: g.category || null,
  }))

  const tagline =
    partner.tagline ||
    partner.shortDescription ||
    `Explore ${partner.category.title} services from ${partner.name}.`

  const description = partner.description || partner.shortDescription || null

  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug || normalizedPartner,
    categorySlug: partner.category.slug,
    categoryTitle: partner.category.title,
    logo: partner.logo || null,
    coverImage: partner.coverImage || null,
    tagline,
    description,
    shortDescription: partner.shortDescription || null,
    verified: Boolean(partner.isVerified),
    partnerSince: partner.partnerSince ?? null,
    locationCoverage: partner.locationCoverage || null,
    pricingRange: partner.pricingRange || null,
    stats: {
      projectsCompleted: partner.projectsCompleted ?? null,
      experience: partner.yearsExperience ?? null,
      rating: typeof partner.rating === 'number' ? partner.rating : null,
      teamSize: partner.teamSize ?? null,
    },
    whyChoose,
    workProcess,
    services,
    locations,
    portfolios,
    reviews,
    faqs,
    gallery,
    categorySpecificData: (partner.categoryData && typeof partner.categoryData === 'object') ? partner.categoryData as Record<string, unknown> : {},
    experienceDisplay: partner.experienceDisplay || null,
  }
}

export function partnerProfileUrl(categorySlug: string, partnerSlug: string) {
  return `/partners/${categorySlug}/${partnerSlug}`
}
