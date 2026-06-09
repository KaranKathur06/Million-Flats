import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DeveloperHero from '@/components/developer-profile/DeveloperHero'
import DeveloperStats from '@/components/developer-profile/DeveloperStats'
import DeveloperAbout from '@/components/developer-profile/DeveloperAbout'
import DeveloperProjects from '@/components/developer-profile/DeveloperProjects'
import DeveloperAchievements from '@/components/developer-profile/DeveloperAchievements'
import DeveloperGallery from '@/components/developer-profile/DeveloperGallery'
import DeveloperVideos from '@/components/developer-profile/DeveloperVideos'
import DeveloperFaqs from '@/components/developer-profile/DeveloperFaqs'
import DeveloperCTA from '@/components/developer-profile/DeveloperCTA'
import EcosystemPartnerRecommendationsSection from '@/components/ecosystem/EcosystemPartnerRecommendationsSection'
import { getPublicDeveloperProfile } from '@/lib/developers/getPublicDeveloperProfile'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DeveloperPageProps = {
  params: { slug: string }
}

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata({ params }: DeveloperPageProps): Promise<Metadata> {
  const developer = await getPublicDeveloperProfile(params.slug)

  if (!developer) {
    return { title: 'Developer Not Found | MillionFlats' }
  }

  const base = getMetadataBase()
  const canonical = base ? `${base}/developers/${params.slug}` : ''

  return {
    title: `${developer.name} Developer Profile | MillionFlats`,
    description:
      developer.shortDescription ||
      `Explore ${developer.name} projects, delivery track record, and verified developer details on MillionFlats.`,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${developer.name} Developer Profile | MillionFlats`,
      description: `Premium projects by ${developer.name} with trusted delivery and high-value communities.`,
      url: canonical || undefined,
      type: 'website',
      images: developer.banner ? [{ url: developer.banner }] : undefined,
    },
  }
}

export default async function DeveloperProfilePage({ params }: DeveloperPageProps) {
  const developer = await getPublicDeveloperProfile(params.slug)

  if (!developer) {
    notFound()
  }

  const base = getMetadataBase()
  const canonical = base ? `${base}/developers/${params.slug}` : ''

  const reasons = [
    {
      title: 'Premium Quality',
      description:
        'Every project is planned around long-term value, superior materials, and design consistency.',
    },
    {
      title: 'On-Time Delivery',
      description:
        'A delivery-first model keeps execution transparent and timelines reliable for buyers and investors.',
    },
    {
      title: 'Trusted Brand',
      description:
        'Strong market credibility built through verified operations and repeat customer confidence.',
    },
    {
      title: 'Innovation in Design',
      description:
        'Modern layouts and future-ready communities designed for comfort, utility, and appreciation.',
    },
  ]

  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: developer.name,
    url: developer.website || canonical || undefined,
    logo: developer.logo !== '/LOGO.jpeg' ? developer.logo : undefined,
    image: developer.banner !== '/HOMEPAGE.jpg' ? developer.banner : undefined,
    description: developer.shortDescription || developer.tagline,
    foundingDate: developer.founded_year ? `${developer.founded_year}` : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: developer.city,
      addressCountry: developer.country,
    },
  }

  if (developer.customerRating && developer.customerRating > 0) {
    organizationSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: developer.customerRating,
      bestRating: 5,
      worstRating: 1,
    }
  }

  const faqSchema =
    developer.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: developer.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }
      : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base || undefined },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Developers',
        item: base ? `${base}/developers` : undefined,
      },
      { '@type': 'ListItem', position: 3, name: developer.name, item: canonical || undefined },
    ],
  }

  return (
    <main className="bg-gray-50 pb-16">
      <DeveloperHero developer={developer} />
      <DeveloperStats developer={developer} />
      <DeveloperAbout developer={developer} />
      <DeveloperProjects
        projects={developer.projects}
        stats={developer.stats}
        developerName={developer.name}
      />
      <DeveloperAchievements achievements={developer.achievements} developerName={developer.name} />
      <DeveloperGallery gallery={developer.gallery} developerName={developer.name} />
      <DeveloperVideos youtubeUrl={developer.socialLinks.youtube} developerName={developer.name} />
      <DeveloperFaqs faqs={developer.faqs} developerName={developer.name} />

      <section className="py-12 sm:py-14 lg:py-16">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">
              Why Choose {developer.name}
            </h2>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              A trusted development partner for premium real estate decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <article
                key={reason.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h3 className="text-base font-semibold text-dark-blue">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <EcosystemPartnerRecommendationsSection
        context="developer"
        city={developer.city}
        layout="full"
        className="bg-white"
      />

      <DeveloperCTA developer={developer} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
    </main>
  )
}
