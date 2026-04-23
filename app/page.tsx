import Image from 'next/image'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import HeroSearch from '@/components/HeroSearch'
import RealtimeBadge from '@/components/analytics/RealtimeBadge'
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'
import { authOptions } from '@/lib/auth'
import { isAdminPanelRole } from '@/lib/roleHomeRoute'

export const dynamic = 'force-dynamic'

const TrustStats = dynamicImport(() => import('@/components/analytics/TrustStats'), { loading: () => null })
const ThreeDTourIntelligence = dynamicImport(() => import('@/components/ThreeDTourIntelligence'), { loading: () => null })
const GlobalMarketSelectorBar = dynamicImport(() => import('@/components/GlobalMarketSelectorBar'), { loading: () => null })
const FeaturedProjects = dynamicImport(() => import('@/components/FeaturedProjects'), { loading: () => null })
const FeaturedAgencies = dynamicImport(() => import('@/components/FeaturedAgencies'), { loading: () => null })
const FeaturedDevelopers = dynamicImport(() => import('@/components/FeaturedDevelopers'), { loading: () => null })

type HomeSectionType =
  | 'trust-stats'
  | '3d-tour'
  | 'market-selector'
  | 'featured-projects'
  | 'featured-properties'
  | 'featured-agencies'
  | 'featured-developers'
  | 'featured-agents'
  | 'cta'

const HOME_SECTIONS: ReadonlyArray<{ type: HomeSectionType; enabled: boolean }> = [
  { type: 'trust-stats', enabled: true },
  { type: '3d-tour', enabled: true },
  { type: 'market-selector', enabled: true },
  { type: 'featured-projects', enabled: true },
  { type: 'featured-properties', enabled: false },
  { type: 'featured-agencies', enabled: true },
  { type: 'featured-developers', enabled: true },
  { type: 'featured-agents', enabled: false },
  { type: 'cta', enabled: true },
]

function isHomeSectionEnabled(type: HomeSectionType) {
  return HOME_SECTIONS.some((section) => section.type === type && section.enabled)
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const marketRaw = typeof searchParams?.market === 'string' ? searchParams?.market : ''
  const hasMarketParam = Boolean(marketRaw)

  return {
    alternates: {
      canonical: '/',
    },
    robots: hasMarketParam ? { index: false, follow: true } : undefined,
  }
}

function resolveMarket(searchParams?: { [key: string]: string | string[] | undefined }): CountryCode {
  const raw = typeof searchParams?.market === 'string' ? searchParams?.market : ''
  if (raw && isCountryCode(raw)) return raw
  return DEFAULT_COUNTRY
}

function buildProjectDiscoveryJsonLd() {
  const siteUrl = String(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://millionflats.com').replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MillionFlats Featured Projects',
    url: `${siteUrl}/`,
    about: 'Curated real estate projects, developers, and 3D-enabled property discovery.',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Projects',
          url: `${siteUrl}/projects`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Developers',
          url: `${siteUrl}/developers`,
        },
      ],
    },
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()
  if (session?.user && isAdminPanelRole(role)) {
    redirect('/admin')
  }

  const market = resolveMarket(searchParams)

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProjectDiscoveryJsonLd()) }}
      />

      <section className="relative w-full flex flex-col justify-end min-h-[400px] sm:min-h-[480px] lg:min-h-[430px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/HOMEPAGE.jpeg"
            alt="Luxury Dubai Property"
            fill
            className="object-cover object-[center_70%]"
            priority
            quality={100}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-[#1e3a5f]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f38]/85 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-5">
              <span className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                Trusted by many Investors
              </span>
            </div>
            <h1 className="text-[clamp(30px,5vw,58px)] font-serif font-bold text-white mb-4 leading-[1.1] tracking-tight">
              Intelligent Property.<br />
              <span className="text-accent-yellow">Intelligent Choice.</span>
            </h1>
            <p className="text-[clamp(14px,1.8vw,17px)] text-white/80 max-w-xl leading-relaxed mb-5">
              We&apos;re your digital sales engine - connecting qualified buyers with premium properties across Dubai, India and beyond.
            </p>
            <RealtimeBadge />
          </div>
        </div>

        <div className="relative z-20 w-full">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        </div>
      </section>

      <section className="relative z-30 w-full -mt-[2px] bg-[#0d1f38]">
        <HeroSearch />
      </section>

      {isHomeSectionEnabled('trust-stats') ? <TrustStats /> : null}
      {isHomeSectionEnabled('3d-tour') ? <ThreeDTourIntelligence /> : null}

      {isHomeSectionEnabled('market-selector') ? (
        <div className="bg-white pt-10">
          <GlobalMarketSelectorBar market={market} />
        </div>
      ) : null}

      {isHomeSectionEnabled('featured-projects') ? (
        <>
          <div className="border-t border-gray-200" />
          <FeaturedProjects market={market} />
        </>
      ) : null}

      {isHomeSectionEnabled('featured-agencies') ? <FeaturedAgencies market={market} /> : null}
      {isHomeSectionEnabled('featured-developers') ? <FeaturedDevelopers market={market} /> : null}

      {isHomeSectionEnabled('cta') ? (
        <section className="bg-dark-blue section-spacing">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
              Ready to List Your Property?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join hundreds of premium agents worldwide who trust millionflats to sell luxury properties at the highest value.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/agent/register" className="bg-accent-yellow text-dark-blue px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors">
                Become an Agent
              </Link>
              <Link href="/projects" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-dark-blue transition-colors">
                Browse Projects
              </Link>
              <Link href="/developers" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-dark-blue transition-colors">
                Explore Developers
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
