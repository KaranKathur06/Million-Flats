import { notFound } from 'next/navigation'
import Script from 'next/script'
import EcosystemHero from '@/components/ecosystem/EcosystemHero'
import EcosystemBenefits from '@/components/ecosystem/EcosystemBenefits'
import EcosystemPartnerGrid, { type EcosystemPartnerCard } from '@/components/ecosystem/EcosystemPartnerGrid'
import EcosystemToolSection from '@/components/ecosystem/EcosystemToolSection'
import EcosystemFAQ, { buildFaqSchema } from '@/components/ecosystem/EcosystemFAQ'
import StickyLeadCaptureClient from '@/components/ecosystem/StickyLeadCaptureClient'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { prisma } from '@/lib/prisma'

function safeNumber(v: unknown) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return null
}

export default async function EcosystemCategoryLanding({ slug, page }: { slug: string; page?: number }) {
  const cfg = getEcosystemCategoryConfig(slug)
  if (!cfg) return notFound()

  const take = 12
  const pageSafe = Number.isFinite(page as number) && (page as number) > 0 ? Math.floor(page as number) : 1

  const baseUrl = `https://millionflats.com/ecosystem-partners/${cfg.slug}`
  const url = pageSafe > 1 ? `${baseUrl}?page=${pageSafe}` : baseUrl

  const category = await (prisma as any).ecosystemCategory.findUnique({ where: { slug: cfg.slug }, select: { id: true } })
  if (!category) return notFound()

  const skip = (pageSafe - 1) * take

  const [partnersRaw, totalPartners] = await Promise.all([
    (prisma as any).ecosystemPartner
      .findMany({
        where: { categoryId: category.id, isActive: true, status: 'APPROVED' },
        orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'desc' }],
        take,
        skip,
        select: {
          id: true,
          name: true,
          logo: true,
          shortDescription: true,
          rating: true,
          yearsExperience: true,
          locationCoverage: true,
          isFeatured: true,
          isVerified: true,
        },
      })
      .catch(() => []),
    (prisma as any).ecosystemPartner.count({ where: { categoryId: category.id, isActive: true, status: 'APPROVED' } }).catch(() => 0),
  ])

  const partners: EcosystemPartnerCard[] = (partnersRaw as any[]).map((p) => ({
    id: String(p.id),
    name: String(p.name),
    logo: p.logo ?? null,
    shortDescription: p.shortDescription ?? null,
    rating: safeNumber(p.rating),
    yearsExperience: safeNumber(p.yearsExperience),
    locationCoverage: p.locationCoverage ?? null,
    isFeatured: Boolean(p.isFeatured),
    isVerified: Boolean(p.isVerified),
  }))

  const hasMorePartners = skip + partners.length < totalPartners

  const faqSchema = buildFaqSchema({ url, faqs: cfg.faqs })

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: cfg.title,
    description: cfg.meta.description,
    provider: {
      '@type': 'Organization',
      name: 'MillionFlats',
      url: 'https://millionflats.com',
    },
    areaServed: 'IN',
    url,
  }

  const partnerSchemas = partners.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: p.name,
    url,
    image: p.logo || undefined,
    aggregateRating:
      typeof p.rating === 'number'
        ? {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            bestRating: 5,
            ratingCount: 1,
          }
        : undefined,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Script id={`ecosystem-faq-schema-${cfg.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script
        id={`ecosystem-service-schema-${cfg.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {partnerSchemas.length ? (
        <Script
          id={`ecosystem-partners-schema-${cfg.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(partnerSchemas) }}
        />
      ) : null}

      <EcosystemHero
        title={cfg.title}
        subtitle={cfg.subtitle}
        image={cfg.heroImage}
        primaryCta={{ label: cfg.primaryCta.label, href: '#lead' }}
        secondaryCta={{ label: cfg.secondaryCta.label, href: '#partners' }}
      />

      <EcosystemBenefits title="Why this matters" benefits={cfg.benefits} />

      <EcosystemToolSection tool={cfg.tool} />

      <EcosystemPartnerGrid
        partners={partners}
        slug={cfg.slug}
        initialPage={pageSafe}
        take={take}
        total={totalPartners}
        hasMore={hasMorePartners}
      />

      <EcosystemFAQ title="Frequently asked questions" faqs={cfg.faqs} />

      <StickyLeadCaptureClient
        categorySlug={cfg.slug}
        defaultMessage={`Hi MillionFlats, I need help with ${cfg.title}. Please contact me.`}
      />
    </div>
  )
}
