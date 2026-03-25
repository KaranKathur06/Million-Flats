import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import HeroSearch from '@/components/HeroSearch'
import FeaturedProperties from '@/components/FeaturedProperties'
import FeaturedProjects from '@/components/FeaturedProjects'
import WhyMillionflats from '@/components/WhyMillionflats'
import FeaturedAgencies from '@/components/FeaturedAgencies'
import FeaturedDevelopers from '@/components/FeaturedDevelopers'
import FeaturedAgents from '@/components/FeaturedAgents'
import GlobalMarketSelectorBar from '@/components/GlobalMarketSelectorBar'
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'
import { authOptions } from '@/lib/auth'
import { isAdminPanelRole } from '@/lib/roleHomeRoute'

export const dynamic = 'force-dynamic'

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
      {/* Hero Section — full bleed image, content + search perfectly contained */}
      <section className="relative w-full flex flex-col">
        {/* Background image layer */}
        <div className="absolute inset-0">
          <Image
            src="/HOMEPAGE.jpg"
            alt="Luxury Dubai Property"
            fill
            className="object-cover object-center"
            priority
            quality={75}
            sizes="100vw"
          />
          {/* Layered overlays for cinematic depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-[#1e3a5f]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f38]/80 via-transparent to-transparent" />
        </div>

        {/* Hero text content */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-28 sm:pb-32">
          <div className="max-w-3xl">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-5">
              <span className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse" />
              <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">Trusted by 10,000+ Investors</span>
            </div>
            <h1 className="text-[clamp(30px,5vw,58px)] font-serif font-bold text-white mb-4 sm:mb-5 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] leading-[1.1] tracking-tight">
              Intelligent Property.<br />
              <span className="text-accent-yellow">Intelligent Choice.</span>
            </h1>
            <p className="text-[clamp(14px,1.8vw,17px)] text-white/80 max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] leading-relaxed">
              We&apos;re your digital sales engine — connecting qualified buyers with premium properties across Dubai, India and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* Search Bar — floats out of hero, perfectly aligned to hero container */}
      <section className="relative z-5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Negative margin pulls card up into hero */}
          <div className="-mt-1 sm:-mt-1">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Why Millionflats Section */}
      <WhyMillionflats />

      <div className="bg-white pt-10">
        <GlobalMarketSelectorBar market={market} />
      </div>

      {/* Featured Projects — curated strategic showcase */}
      <div className="border-t border-gray-200" />
      <FeaturedProjects market={market} />

      <FeaturedProperties market={market} />

      <FeaturedAgencies market={market} />

      <FeaturedDevelopers market={market} />

      <FeaturedAgents market={market} />

      {/* CTA Section */}
      <section className="bg-dark-blue section-spacing">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
            Ready to List Your Property?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of premium agents worldwide who trust millionflats to sell luxury properties at the highest value.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/agent/register"
              className="bg-accent-yellow text-dark-blue px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
            >
              Become an Agent
            </Link>
            <Link
              href="/auth/redirect?next=/contact"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-dark-blue transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

