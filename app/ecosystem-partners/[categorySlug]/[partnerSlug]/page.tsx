import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPartnerProfile } from '@/lib/ecosystem/partnerProfile'
import {
  PartnerHero,
  PartnerStats,
  PartnerAbout,
  PartnerTrust,
  PartnerPortfolio,
  PartnerServices,
  PartnerProcess,
  PartnerTestimonials,
  PartnerLocations,
  PartnerFaqs,
  PartnerCTA,
} from '@/components/partner-profile'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PartnerPageProps = {
  params: { categorySlug: string; partnerSlug: string }
}

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata({ params }: PartnerPageProps): Promise<Metadata> {
  const partner = await getPartnerProfile(params.categorySlug, params.partnerSlug)
  if (!partner) return { title: 'Partner Not Found | MillionFlats' }

  const base = getMetadataBase()
  const canonical = base
    ? `${base}/ecosystem-partners/${partner.categorySlug}/${partner.slug}`
    : ''

  const title =
    partner.shortDescription
      ? `${partner.name} — ${partner.categoryTitle} | MillionFlats`
      : `${partner.name} ${partner.categoryTitle} in ${partner.locationCoverage || 'India'} | MillionFlats`

  return {
    title,
    description:
      partner.shortDescription ||
      `Explore ${partner.name} portfolio, services, and client reviews. Request a consultation through MillionFlats.`,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: partner.tagline,
      url: canonical || undefined,
      type: 'website',
      images: partner.coverImage ? [{ url: partner.coverImage }] : undefined,
    },
  }
}

export default async function PartnerProfilePage({ params }: PartnerPageProps) {
  const partner = await getPartnerProfile(params.categorySlug, params.partnerSlug)
  if (!partner) notFound()

  const base = getMetadataBase()
  const canonical = base
    ? `${base}/ecosystem-partners/${partner.categorySlug}/${partner.slug}`
    : ''

  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: partner.name,
    description: partner.shortDescription || partner.tagline,
    image: partner.coverImage,
    logo: partner.logo,
    areaServed: partner.locations.map((l) => l.city),
    serviceType: partner.categoryTitle,
  }

  if (partner.stats.rating) {
    organizationSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: partner.stats.rating,
      bestRating: 5,
      worstRating: 1,
    }
  }

  const faqSchema =
    partner.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: partner.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base || undefined },
      { '@type': 'ListItem', position: 2, name: 'Ecosystem', item: base ? `${base}/ecosystem-partners` : undefined },
      {
        '@type': 'ListItem',
        position: 3,
        name: partner.categoryTitle,
        item: base ? `${base}/ecosystem-partners/${partner.categorySlug}` : undefined,
      },
      { '@type': 'ListItem', position: 4, name: partner.name, item: canonical || undefined },
    ],
  }

  return (
    <main className="bg-gray-50 pb-16">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 px-4 py-3 text-xs text-gray-500 sm:px-6 lg:px-8 sm:text-sm">
          <Link href="/ecosystem-partners" className="hover:text-dark-blue">
            Ecosystem
          </Link>
          <span>/</span>
          <Link href={`/ecosystem-partners/${partner.categorySlug}`} className="hover:text-dark-blue">
            {partner.categoryTitle}
          </Link>
          <span>/</span>
          <span className="font-medium text-dark-blue">{partner.name}</span>
        </div>
      </nav>

      <PartnerHero partner={partner} />
      <PartnerStats partner={partner} />
      <PartnerAbout partner={partner} />
      <PartnerTrust partnerName={partner.name} items={partner.whyChoose} />
      <PartnerPortfolio portfolios={partner.portfolios} partnerName={partner.name} />
      <PartnerServices services={partner.services} partnerName={partner.name} />
      <PartnerProcess steps={partner.workProcess} partnerName={partner.name} />
      <PartnerTestimonials reviews={partner.reviews} partnerName={partner.name} />
      <PartnerLocations
        locations={partner.locations}
        locationCoverage={partner.locationCoverage}
        partnerName={partner.name}
      />
      <PartnerFaqs faqs={partner.faqs} partnerName={partner.name} />
      <PartnerCTA partner={partner} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
    </main>
  )
}
