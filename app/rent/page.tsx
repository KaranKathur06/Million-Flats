import type { Metadata } from 'next'
import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'
import PropertiesHero from '@/components/properties/PropertiesHero'
import { resolveCityScopedHeroBanner } from '@/lib/heroBanners'
import { buildSocialMetadata } from '@/lib/socialMetadata'
import { resolveCitySearchScope } from '@/lib/citySearch'

const TITLE = 'Rent Premium Properties | MillionFlats'
const DESCRIPTION = 'Find rental properties across India and the UAE with MillionFlats.'

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export async function generateMetadata({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>
}): Promise<Metadata> {
  const city = firstParam(searchParams.city) || firstParam(searchParams.location)
  const country = firstParam(searchParams.country)
  const scope = city ? await resolveCitySearchScope(city, country || null) : null
  const banner = await resolveCityScopedHeroBanner('RENT', city, country, scope || undefined)
  const canonical = scope?.status === 'resolved'
    ? `/rent?city=${encodeURIComponent(scope.name!)}&country=${scope.countryIso2}`
    : '/rent'
  const title = scope?.status === 'resolved' ? `Properties for Rent in ${scope.name} | MillionFlats` : TITLE
  const description = scope?.status === 'resolved'
    ? `Find rental homes and apartments in ${scope.name}.`
    : DESCRIPTION

  return {
    title,
    description,
    alternates: { canonical },
    ...(scope && scope.status !== 'resolved' ? { robots: { index: false, follow: true } } : {}),
    ...buildSocialMetadata({
      title,
      description,
      url: canonical,
      image: banner.desktopImage || '/HOMEPAGE.jpeg',
      imageAlt: banner.desktopAlt,
    }),
  }
}

export default async function RentPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const city = firstParam(searchParams.city) || firstParam(searchParams.location)
  const countryValue = searchParams.country || 'INDIA'
  const country = Array.isArray(countryValue) ? countryValue[0] : countryValue
  const cityScope = city ? await resolveCitySearchScope(city, firstParam(searchParams.country) || null) : null
  const initialBanner = await resolveCityScopedHeroBanner('RENT', city, country, cityScope || undefined)
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-16">
          <PropertiesHero title={initialBanner.headline} subtitle={initialBanner.subheadline} banner={initialBanner} breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Rent', href: '/rent' }]} />
          <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PropertiesClient forcedPurpose="rent" initialBanner={initialBanner} cityScope={cityScope || undefined} />
    </Suspense>
  )
}
