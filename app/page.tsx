import Image from 'next/image'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import HeroSearch from '@/components/HeroSearch'
import RealtimeBadge from '@/components/analytics/RealtimeBadge'
import { authOptions } from '@/lib/auth'
import { isAdminPanelRole } from '@/lib/roleHomeRoute'
import MetaDologyVideoSection from '@/components/MetaDologyVideoSection'
import AssociatedCompanies from '@/components/AssociatedCompanies'
import HomeVideoReelsSection from '@/components/videoReels/HomeVideoReelsSection'
import { getBaseUrl } from '@/lib/auth/routes'
import { buildSocialMetadata } from '@/lib/socialMetadata'

export const dynamic = 'force-dynamic'

const TrustStats = dynamicImport(() => import('@/components/analytics/TrustStats'), { loading: () => null })
const FeaturedProjects = dynamicImport(() => import('@/components/FeaturedProjects'), { loading: () => null })
const FeaturedDevelopers = dynamicImport(() => import('@/components/FeaturedDevelopers'), { loading: () => null })

type HomeSectionType =
  | 'trust-stats'
  | 'meta-dology-video'
  | 'video-reels'
  | 'featured-projects'
  | 'featured-properties'
  | 'featured-developers'
  | 'featured-agents'
  | 'cta'

const HOME_SECTIONS: ReadonlyArray<{ type: HomeSectionType; enabled: boolean }> = [
  { type: 'trust-stats', enabled: true },
  { type: 'meta-dology-video', enabled: true },
  { type: 'video-reels', enabled: true },
  { type: 'featured-projects', enabled: true },
  { type: 'featured-properties', enabled: false },
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
    ...buildSocialMetadata({
      title: 'MillionFlats | Global Luxury Real Estate Marketplace',
      description:
        'Safely invest in premium ₹3Cr+ villas, penthouses, and off-plan projects across India and Dubai. Fully backed by institutional compliance, secure LRS/FEMA routing, and 3D digital twins.',
      url: '/',
      image: '/meta.jpeg',
      imageAlt: 'MillionFlats Global Luxury Real Estate Marketplace',
    }),
  }
}

function buildProjectDiscoveryJsonLd() {
  const siteUrl = getBaseUrl()
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

function VerifiedBrokerShowcase() {
  return (
    <section className="relative py-4 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[22px] border border-[#cfc5b9] bg-[#f3efe7] p-4 shadow-[0_18px_34px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_230px]">
            <div className="flex min-h-[150px] items-center">
              <p className="text-[clamp(2rem,3vw,3.2rem)] leading-[1.05] font-serif text-[#0e1d2d]">
                Millionflats Pvt. Ltd., Gujarat is a
                <span className="mt-2 block font-black tracking-[-0.04em] text-[#0e1d2d]">
                  NexTech Verified Broker
                </span>
              </p>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="relative h-[180px] w-[180px] sm:h-[210px] sm:w-[210px]">
                <svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-[0_8px_18px_rgba(14,30,52,0.18)]">
                  <defs>
                    <path id="brokerArc" d="M 20 110 A 90 90 0 1 1 200 110" />
                  </defs>

                  <circle cx="110" cy="110" r="98" fill="#082d52" />
                  <circle cx="110" cy="110" r="92" fill="#f6f6f4" stroke="#0a2f58" strokeWidth="8" />

                  <g opacity="0.9">
                    <path d="M34 110c9-14 23-18 37-26c-4 18-10 31-26 44c-5-4-9-8-11-18z" fill="#0c2f56" />
                    <path d="M186 110c-9-14-23-18-37-26c4 18 10 31 26 44c5-4 9-8 11-18z" fill="#0c2f56" />
                  </g>

                  <text fill="#0c2f56" fontSize="10.5" fontWeight="700" letterSpacing="1.8">
                    <textPath href="#brokerArc" startOffset="50%" textAnchor="middle">VERIFIED BROKER</textPath>
                  </text>

                  <g transform="translate(0 4)">
                    <rect x="52" y="72" width="116" height="60" rx="12" fill="#f7f8fa" />
                    <rect x="52" y="72" width="116" height="60" rx="12" fill="none" stroke="#d5d9df" />
                    <text x="110" y="96" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a" letterSpacing="-1.5">
                      NEX
                      <tspan fill="#0c92f2">TECH</tspan>
                    </text>
                    <line x1="64" y1="107" x2="156" y2="107" stroke="#0e2a47" strokeWidth="2" opacity="0.7" />
                    <text x="110" y="120" textAnchor="middle" fontSize="10" letterSpacing="1.5" fill="#0e2a47" fontWeight="700">
                      GLOBAL LTD.
                    </text>
                  </g>

                  <g transform="translate(0 0)">
                    <path d="M110 136l14 14 18-28c-10 4-18 5-32 14z" fill="#0d4d8b" opacity="0.3" />
                    <path d="M88 128h44a18 18 0 0 1 18 18v22a18 18 0 0 1-18 18h-44a18 18 0 0 1-18-18v-22a18 18 0 0 1 18-18z" fill="#0d4d8b" />
                    <path d="M92 141l18 18 32-38 0 0-10 0-22 26-8-8-10 2z" fill="#f3f5f7" opacity="0.98" />
                    <path d="M110 133l17 16 18-31-10 0-8 14-17-18-18 19 18 20z" fill="#f3f5f7" opacity="0.95" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()
  if (session?.user && isAdminPanelRole(role)) {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProjectDiscoveryJsonLd()) }}
      />

      <section className="relative w-full flex flex-col justify-end min-h-[400px] sm:min-h-[480px] lg:min-h-[430px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/HOMEPAGE.webp"
            alt="Luxury Dubai Property"
            fill
            className="object-cover object-[center_70%]"
            priority
            quality={85}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-[#1e3a5f]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f38]/85 via-transparent to-transparent" />
        </div>
        <br></br>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-5">
              <span className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                Trusted by many Investors
              </span>
            </div>
            <h1 className="text-[clamp(30px,5vw,58px)] font-serif font-bold text-white mb-4 leading-[1.1] tracking-tight">
              <br></br>
              The Architecture of Trust.<br />
              <span className="text-accent-yellow">Own the Extraordinary</span>
            </h1>
            <p className="text-[clamp(14px,1.8vw,17px)] text-white/80 max-w-xl leading-relaxed mb-5">
              Premium UAE and Indian real estate - with certified 3D property tours, AI investment scoring, and independent legal checks. The smarter way to buy from anywhere in the world.
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

      <VerifiedBrokerShowcase />
      {isHomeSectionEnabled('trust-stats') ? <TrustStats /> : null}
      <AssociatedCompanies />
      {isHomeSectionEnabled('meta-dology-video') ? <MetaDologyVideoSection /> : null}
      {isHomeSectionEnabled('video-reels') && String(process.env.VIDEO_REELS_ENABLED || '').toLowerCase() === 'true'
        ? <HomeVideoReelsSection />
        : null}

      {isHomeSectionEnabled('featured-projects') ? (
        <>
          <div className="border-t border-gray-200" />
          <FeaturedProjects
            market="UAE"
            title="Dubai Properties"
            description="Carefully selected landmark developments across Dubai and the UAE."
          />
          <FeaturedProjects
            market="INDIA"
            title="India Properties"
            description="Carefully selected landmark developments across India's leading markets."
          />
        </>
      ) : null}

      {isHomeSectionEnabled('featured-developers') ? <FeaturedDevelopers market="UAE" /> : null}

      {isHomeSectionEnabled('cta') ? (
        <section className="bg-dark-blue section-spacing">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
              Grow Your Real Estate Business
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join verified agents, developers, and agencies on MillionFlats — the premium platform built for real estate professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href="/agent/register" className="bg-white text-dark-blue px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Become an Agent
              </Link>
              <Link href="/developer/auth" className="bg-transparent border-2 border-white/60 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-dark-blue transition-colors">
                Become a Developer
              </Link>
              <Link href="/agency/auth" className="bg-accent-yellow text-dark-blue px-8 py-3 rounded-lg font-semibold hover:brightness-105 shadow-lg shadow-accent-yellow/20 transition-all">
                Become an Agency
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
