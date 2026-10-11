import type { Metadata } from 'next'
import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'
import PropertiesHero from '@/components/properties/PropertiesHero'
import { resolveHeroBanner } from '@/lib/heroBanners'
import { buildSocialMetadata } from '@/lib/socialMetadata'

const TITLE = 'Buy Premium Properties | MillionFlats'
const DESCRIPTION = 'Discover properties for sale across India and the UAE with MillionFlats.'

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export async function generateMetadata({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>
}): Promise<Metadata> {
  const banner = await resolveHeroBanner({
    category: 'BUY',
    city: firstParam(searchParams.location) || firstParam(searchParams.city),
    country: firstParam(searchParams.country) || 'INDIA',
  })

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/buy' },
    ...buildSocialMetadata({
      title: TITLE,
      description: DESCRIPTION,
      url: '/buy',
      image: banner.desktopImage || '/HOMEPAGE.jpeg',
      imageAlt: banner.desktopAlt,
    }),
  }
}

export default async function BuyPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const cityValue = searchParams.location || searchParams.city || ''
  const city = Array.isArray(cityValue) ? cityValue[0] : cityValue
  const countryValue = searchParams.country || 'INDIA'
  const country = Array.isArray(countryValue) ? countryValue[0] : countryValue
  const initialBanner = await resolveHeroBanner({ category: 'BUY', city, country })
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-16">
          <PropertiesHero title={initialBanner.headline} subtitle={initialBanner.subheadline} banner={initialBanner} breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Buy', href: '/buy' }]} />
          <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PropertiesClient forcedPurpose="buy" initialBanner={initialBanner} />
    </Suspense>
  )
}
