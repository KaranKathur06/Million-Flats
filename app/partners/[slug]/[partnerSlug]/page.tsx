import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPartnerProfile, partnerProfileUrl } from '@/lib/ecosystem/partnerProfile'
import { getCategorySchema } from '@/lib/ecosystem/admin/categoryFieldRegistry'
import { buildSocialMetadata } from '@/lib/socialMetadata'
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
import PartnerCategoryDetails from '@/components/partner-profile/PartnerCategoryDetails'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PartnerPageProps = {
  params: { slug: string; partnerSlug: string }
}

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

function hasValue(value: unknown) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

export async function generateMetadata({ params }: PartnerPageProps): Promise<Metadata> {
  const partner = await getPartnerProfile(params.slug, params.partnerSlug)
  if (!partner) return { title: 'Partner Not Found | MillionFlats' }

  const base = getMetadataBase()
  const canonical = base ? `${base}${partnerProfileUrl(partner.categorySlug, partner.slug)}` : ''

  const title =
    partner.shortDescription
      ? `${partner.name} — ${partner.categoryTitle} | MillionFlats`
      : `${partner.name} ${partner.categoryTitle} in ${partner.locationCoverage || 'India'} | MillionFlats`

  return {
    title,
    robots: { index: true, follow: true },
    description:
      partner.shortDescription ||
      `Explore ${partner.name} portfolio, services, and client reviews. Request a consultation through MillionFlats.`,
    alternates: canonical ? { canonical } : undefined,
    ...buildSocialMetadata({
      title,
      description: partner.tagline,
      url: canonical || undefined,
      type: 'website',
      image: partner.coverImage,
    }),
  }
}

export default async function PartnerProfilePage({ params }: PartnerPageProps) {
  const partner = await getPartnerProfile(params.slug, params.partnerSlug)
  if (!partner) notFound()

  const base = getMetadataBase()
  const canonical = base ? `${base}${partnerProfileUrl(partner.categorySlug, partner.slug)}` : ''

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

  const categorySchema = getCategorySchema(partner.categorySlug)
  const hasCategoryDetails = Boolean(
    categorySchema?.fields.some(
      (field) =>
      field.type !== 'email' &&
      field.type !== 'tel' &&
      hasValue(partner.categorySpecificData?.[field.name])
    )
  )
  const profileSections = [
    { id: 'partner-overview', label: 'Overview', visible: Boolean(partner.description || partner.pricingRange) },
    { id: 'partner-services', label: 'Services', visible: partner.services.length > 0 },
    { id: 'partner-details', label: 'Category details', visible: hasCategoryDetails },
    { id: 'partner-portfolio', label: 'Portfolio', visible: partner.portfolios.length > 0 || partner.gallery.length > 0 },
    { id: 'partner-trust', label: 'Why work with them', visible: partner.whyChoose.length > 0 },
    { id: 'partner-process', label: 'Process', visible: partner.workProcess.length > 0 },
    { id: 'partner-reviews', label: 'Reviews', visible: partner.reviews.length > 0 },
    { id: 'partner-locations', label: 'Locations', visible: partner.locations.length > 0 || Boolean(partner.locationCoverage) },
    { id: 'partner-faqs', label: 'FAQs', visible: partner.faqs.length > 0 },
  ].filter((section) => section.visible)

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
    <main className="min-h-screen bg-[#f5f7fa] pb-16">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-2 px-4 py-3 text-xs text-slate-500 sm:px-6 sm:text-sm lg:px-8">
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

      <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <PartnerHero partner={partner} />
        <PartnerStats partner={partner} />

        <nav
          aria-label="Partner profile sections"
          className="sticky top-20 z-20 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-3"
        >
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap">
            {profileSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] sm:text-sm"
              >
                {section.label}
              </a>
            ))}
            <a
              href="#partner-contact"
              className="shrink-0 rounded-xl bg-[#1e3a5f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#17304f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] sm:ml-auto sm:text-sm"
            >
              Request consultation
            </a>
          </div>
        </nav>

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div className="min-w-0 divide-y divide-slate-200/80">
            <PartnerAbout partner={partner} />
            <PartnerServices services={partner.services} partnerName={partner.name} />
            {hasCategoryDetails && (
              <PartnerCategoryDetails
                categorySlug={partner.categorySlug}
                data={partner.categorySpecificData || {}}
              />
            )}
            <PartnerPortfolio
              portfolios={partner.portfolios}
              gallery={partner.gallery}
              partnerName={partner.name}
            />
            <PartnerTrust partnerName={partner.name} items={partner.whyChoose} />
            <PartnerProcess steps={partner.workProcess} partnerName={partner.name} />
            <PartnerTestimonials reviews={partner.reviews} partnerName={partner.name} />
            <PartnerLocations
              locations={partner.locations}
              locationCoverage={partner.locationCoverage}
              partnerName={partner.name}
            />
            <PartnerFaqs faqs={partner.faqs} partnerName={partner.name} />
          </div>

          <aside className="order-first lg:sticky lg:top-24 lg:order-last">
            <PartnerCTA partner={partner} />
          </aside>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
    </main>
  )
}
