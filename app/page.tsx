import Image from 'next/image'
import Link from 'next/link'
import HeroSearch from '@/components/HeroSearch'
import FeaturedProperties from '@/components/FeaturedProperties'
import WhyMillionflats from '@/components/WhyMillionflats'
import FeaturedAgencies from '@/components/FeaturedAgencies'
import FeaturedDevelopers from '@/components/FeaturedDevelopers'
import FeaturedAgents from '@/components/FeaturedAgents'
import GlobalMarketSelectorBar from '@/components/GlobalMarketSelectorBar'
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'

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
  const market = resolveMarket(searchParams)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full aspect-[16/9] max-h-[90vh] lg:max-h-[630px]">
        <Image
          src="/HOMEPAGE.jpg"
          alt="Luxury Home"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1920px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/55" />

        <div className="absolute inset-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pt-12 pb-10 md:pt-16 md:pb-12">
            <div className="w-full">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                  Intelligent Property. Intelligent Choice.
                </h1>
                <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                  We’re your digital sales engine, not just another marketplace. We deliver qualified buyers and transaction-ready technology, connecting your properties with serious investors, buyers and sellers.
                </p>
              </div>
              <div className="w-full max-w-[1400px] mx-auto">
                <HeroSearch />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Millionflats Section */}
      <WhyMillionflats />

      <div className="bg-white pt-10">
        <GlobalMarketSelectorBar market={market} />
      </div>

      <FeaturedProperties market={market} />

      <FeaturedAgencies market={market} />

      <FeaturedDevelopers market={market} />

      <FeaturedAgents market={market} />

      {/* CTA Section */}
      <section className="bg-dark-blue py-20">
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

