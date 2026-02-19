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

export default async function EcosystemCategoryLanding({ slug }: { slug: string }) {
  const cfg = getEcosystemCategoryConfig(slug)
  if (!cfg) return notFound()

  const url = `https://millionflats.com/ecosystem-partners/${cfg.slug}`

  const partnersRaw = await prisma.ecosystemPartner
    .findMany({
      where: { category: { slug: cfg.slug }, isActive: true },
      orderBy: [{ priorityOrder: 'asc' }, { createdAt: 'desc' }],
      take: 60,
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
    .catch(() => [])

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

  const faqSchema = buildFaqSchema({ url, faqs: cfg.faqs })

  return (
    <div className="min-h-screen bg-gray-50">
      <Script id={`ecosystem-faq-schema-${cfg.slug}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <EcosystemHero
        title={cfg.title}
        subtitle={cfg.subtitle}
        image={cfg.heroImage}
        primaryCta={{ label: cfg.primaryCta.label, href: '#lead' }}
        secondaryCta={{ label: cfg.secondaryCta.label, href: '#partners' }}
      />

      <EcosystemBenefits title="Why this matters" benefits={cfg.benefits} />

      <EcosystemToolSection tool={cfg.tool} />

      <EcosystemPartnerGrid partners={partners} slug={cfg.slug} />

      <EcosystemFAQ title="Frequently asked questions" faqs={cfg.faqs} />

      <StickyLeadCaptureClient
        categorySlug={cfg.slug}
        defaultMessage={`Hi MillionFlats, I need help with ${cfg.title}. Please contact me.`}
      />
    </div>
  )
}
