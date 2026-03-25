import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeveloperHero from '@/components/developer-profile/DeveloperHero'
import DeveloperStats from '@/components/developer-profile/DeveloperStats'
import DeveloperAbout from '@/components/developer-profile/DeveloperAbout'
import DeveloperProjects from '@/components/developer-profile/DeveloperProjects'
import DeveloperCTA from '@/components/developer-profile/DeveloperCTA'
import type { DeveloperProfileData } from '@/components/developer-profile/types'

type DeveloperPageProps = {
  params: { slug: string }
}

function formatAED(value: number | null | undefined) {
  if (!value || value <= 0) return null
  return `AED ${Math.round(value).toLocaleString('en-US')}`
}

function mapCountry(code?: string | null) {
  if (code === 'INDIA') return 'India'
  return 'UAE'
}

async function getDeveloperProfile(slug: string): Promise<DeveloperProfileData | null> {
  const developer = await (prisma as any).developer.findUnique({
    where: { slug },
    include: {
      projects: {
        where: { status: 'PUBLISHED' },
        orderBy: { updatedAt: 'desc' },
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
      },
    },
  })

  if (!developer) return null

  // Hide inactive or soft-deleted developers from public view
  if (developer.status === 'INACTIVE' || developer.isDeleted) return null

  const projects = Array.isArray(developer.projects) ? developer.projects : []
  const projectPrices = projects.map((item: any) => Number(item.startingPrice || 0)).filter((value: number) => value > 0)
  const minPrice = projectPrices.length > 0 ? Math.min(...projectPrices) : null
  const maxPrice = projectPrices.length > 0 ? Math.max(...projectPrices) : null

  const citySet = new Set<string>(
    projects
      .map((item: any) => String(item.city || '').trim())
      .filter(Boolean)
  )

  // Calculate experience from foundedYear (DB) or fallback to createdAt
  const foundedYear = developer.foundedYear || new Date(developer.createdAt).getFullYear()
  const experience = Math.max(1, new Date().getFullYear() - foundedYear)

  const primaryCity = developer.city || citySet.values().next().value || 'Dubai'
  const country = mapCountry(developer.countryCode)

  // Use DB description or generate fallback
  const description = developer.description
    || `${developer.name} is known for premium residential developments built with a strong focus on trust, quality, and long-term value.

With a delivery-first approach, the brand has scaled across key micro-markets while maintaining construction standards and investor confidence.

From design-led communities to strategic launch locations, ${developer.name} continues to serve end-users and investors looking for reliable execution at scale.`

  const tagline = developer.shortDescription
    || 'Luxury communities crafted with trust, scale, and on-time delivery.'

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
  }
}

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata({ params }: DeveloperPageProps): Promise<Metadata> {
  const developer = await getDeveloperProfile(params.slug)

  if (!developer) {
    return { title: 'Developer Not Found | MillionFlats' }
  }

  const base = getMetadataBase()
  const canonical = base ? `${base}/developers/${params.slug}` : ''

  return {
    title: `${developer.name} Developer Profile | MillionFlats`,
    description: developer.shortDescription || `Explore ${developer.name} projects, delivery track record, and verified developer details on MillionFlats.`,
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
  const developer = await getDeveloperProfile(params.slug)

  if (!developer) {
    notFound()
  }

  const reasons = [
    {
      title: 'Premium Quality',
      description: 'Every project is planned around long-term value, superior materials, and design consistency.',
    },
    {
      title: 'On-Time Delivery',
      description: 'A delivery-first model keeps execution transparent and timelines reliable for buyers and investors.',
    },
    {
      title: 'Trusted Brand',
      description: 'Strong market credibility built through verified operations and repeat customer confidence.',
    },
    {
      title: 'Innovation in Design',
      description: 'Modern layouts and future-ready communities designed for comfort, utility, and appreciation.',
    },
  ]

  return (
    <main className="bg-gray-50 pb-16">
      <DeveloperHero developer={developer} />
      <DeveloperStats stats={developer.stats} />
      <DeveloperAbout developer={developer} />
      <DeveloperProjects projects={developer.projects} />

      <section className="py-12 sm:py-14 lg:py-16">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Why Choose This Developer</h2>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">A trusted development partner for premium real estate decisions.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <article key={reason.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-base font-semibold text-dark-blue">{reason.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <DeveloperCTA developer={developer} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: developer.name,
            url: developer.website || undefined,
            logo: developer.logo !== '/LOGO.jpeg' ? developer.logo : undefined,
            image: developer.banner !== '/HOMEPAGE.jpg' ? developer.banner : undefined,
            description: developer.shortDescription || developer.tagline,
            foundingDate: developer.founded_year ? `${developer.founded_year}` : undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: developer.city,
              addressCountry: developer.country,
            },
          }),
        }}
      />
    </main>
  )
}
