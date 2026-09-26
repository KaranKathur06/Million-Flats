import type { Metadata } from 'next'
import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'
import { resolveHeroBanner } from '@/lib/heroBanners'
import PropertiesHero from '@/components/properties/PropertiesHero'

type SearchParams = Record<string, string | string[] | undefined>

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function siteUrl() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

function absoluteUrl(path: string) {
  const base = siteUrl()
  if (!base) return ''
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl('/properties')
  return {
    title: 'Properties for Sale in UAE | millionflats',
    description:
      'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details with SEO-ready listings.',
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: 'Properties for Sale in UAE | millionflats',
      description:
        'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details.',
      url: canonical || undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Properties for Sale in UAE | millionflats',
      description:
        'Browse premium projects and properties for sale across the UAE. Compare prices, locations, amenities, and developer details.',
    },
  }
}

export default async function PropertiesPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const purpose = firstParam(searchParams.purpose).toLowerCase() === 'rent' ? 'RENT' : 'BUY'
  const city = firstParam(searchParams.location) || firstParam(searchParams.city)
  const country = firstParam(searchParams.country) || 'INDIA'
  const initialBanner = await resolveHeroBanner({ category: purpose, city, country })
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-16">
            <PropertiesHero title={initialBanner.headline} subtitle={initialBanner.subheadline} banner={initialBanner} />
            <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PropertiesClient initialBanner={initialBanner} />
    </Suspense>
  )
}

