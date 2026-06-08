import { prisma } from '@/lib/prisma'
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

const DEFAULT_WHY_CHOOSE: PartnerWhyChooseItem[] = [
  { title: 'Experienced Team', description: 'Seasoned designers and project managers with proven delivery across luxury residential projects.' },
  { title: 'Luxury Expertise', description: 'Specialists in high-end villas, premium apartments, and bespoke interior transformations.' },
  { title: 'Transparent Process', description: 'Clear milestones, documented budgets, and regular progress updates throughout your project.' },
  { title: 'Dedicated Project Manager', description: 'A single point of contact coordinating design, vendors, and on-site execution.' },
  { title: 'After-sales Support', description: 'Post-handover assistance for snags, adjustments, and warranty-related coordination.' },
  { title: 'Custom Solutions', description: 'Tailored design approaches aligned with your lifestyle, property type, and budget.' },
]

const DEFAULT_WORK_PROCESS: PartnerProcessStep[] = [
  { step: 1, title: 'Consultation', description: 'Understand your space, lifestyle, budget, and design preferences.' },
  { step: 2, title: 'Concept Design', description: 'Mood boards, layout options, and initial design direction.' },
  { step: 3, title: 'Design Development', description: 'Detailed drawings, material selections, and 3D visualizations.' },
  { step: 4, title: 'Budget Approval', description: 'Transparent BOQ and milestone-based cost breakdown.' },
  { step: 5, title: 'Execution', description: 'On-site coordination, quality checks, and vendor management.' },
  { step: 6, title: 'Handover', description: 'Final walkthrough, snag resolution, and project completion.' },
]

const DEFAULT_SERVICES = [
  'Space Planning',
  'Interior Design',
  'Turnkey Execution',
  'Renovation',
  'Furniture Selection',
  'Lighting Design',
  '3D Visualization',
  'Project Management',
]

const DEFAULT_FAQS: PartnerFaqItem[] = [
  {
    id: 'default-1',
    question: 'How much does interior design cost?',
    answer: 'Costs vary by scope, property size, and finish level. Most projects range from ₹1,500–₹4,500 per sq. ft. for full interiors. Request a consultation for a tailored estimate.',
  },
  {
    id: 'default-2',
    question: 'How long does renovation take?',
    answer: 'A typical 3BHK turnkey project takes 60–120 days depending on civil work, modular scope, and custom elements.',
  },
  {
    id: 'default-3',
    question: 'Do you provide turnkey solutions?',
    answer: 'Yes. End-to-end design, procurement, execution, and handover are available through our verified partner network.',
  },
  {
    id: 'default-4',
    question: 'Can I get 3D design previews?',
    answer: 'Most partners offer photorealistic 3D renders before execution so you can visualize the final outcome.',
  },
]

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
      isActive: true,
      status: 'APPROVED',
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

  const services: PartnerServiceItem[] =
    partner.services?.length > 0
      ? partner.services.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description || null,
        }))
      : DEFAULT_SERVICES.map((name, i) => ({
          id: `default-svc-${i}`,
          name,
          description: null,
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

  const faqs: PartnerFaqItem[] =
    partner.faqs?.length > 0
      ? partner.faqs.map((f: any) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }))
      : DEFAULT_FAQS

  const gallery: PartnerGalleryItem[] = (partner.gallery || []).map((g: any) => ({
    id: g.id,
    imageUrl: g.imageUrl,
    caption: g.caption || null,
    category: g.category || null,
  }))

  const tagline =
    partner.tagline ||
    partner.shortDescription ||
    'Premium design and execution for luxury homes across India.'

  const description =
    partner.description ||
    `${partner.name} is a verified MillionFlats ecosystem partner delivering premium interior design and renovation services with a focus on quality, transparency, and client satisfaction.`

  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug || normalizedPartner,
    categorySlug: partner.category.slug,
    categoryTitle: partner.category.title,
    logo: partner.logo || '/LOGO.jpeg',
    coverImage: partner.coverImage || partner.logo || '/HOMEPAGE.jpg',
    tagline,
    description,
    shortDescription: partner.shortDescription || null,
    verified: Boolean(partner.isVerified),
    partnerSince: partner.partnerSince || new Date(partner.createdAt).getFullYear(),
    locationCoverage: partner.locationCoverage || null,
    pricingRange: partner.pricingRange || null,
    stats: {
      projectsCompleted: partner.projectsCompleted ?? null,
      experience: partner.yearsExperience ?? null,
      rating: typeof partner.rating === 'number' ? partner.rating : null,
      teamSize: partner.teamSize ?? null,
    },
    whyChoose: whyChoose.length > 0 ? whyChoose : DEFAULT_WHY_CHOOSE,
    workProcess: workProcess.length > 0 ? workProcess : DEFAULT_WORK_PROCESS,
    services,
    locations,
    portfolios,
    reviews,
    faqs,
    gallery,
  }
}

export function partnerProfileUrl(categorySlug: string, partnerSlug: string) {
  return `/ecosystem-partners/${categorySlug}/${partnerSlug}`
}
