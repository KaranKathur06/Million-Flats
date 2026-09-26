import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'
import PropertiesHero from '@/components/properties/PropertiesHero'
import { resolveHeroBanner } from '@/lib/heroBanners'

export const metadata = {
  title: 'Rent Premium Properties | MillionFlats',
  description: 'Find rental properties across India and the UAE with MillionFlats.',
  alternates: { canonical: '/rent' },
}

export default async function RentPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const cityValue = searchParams.location || searchParams.city || ''
  const city = Array.isArray(cityValue) ? cityValue[0] : cityValue
  const countryValue = searchParams.country || 'INDIA'
  const country = Array.isArray(countryValue) ? countryValue[0] : countryValue
  const initialBanner = await resolveHeroBanner({ category: 'RENT', city, country })
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
      <PropertiesClient forcedPurpose="rent" initialBanner={initialBanner} />
    </Suspense>
  )
}
