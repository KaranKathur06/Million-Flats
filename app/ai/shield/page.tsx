import type { Metadata } from 'next'
import { Suspense } from 'react'
import AIShieldDashboard from '@/components/aishield/AIShieldDashboard'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'AIShield™ AI Property Valuation Dubai & UAE | MillionFlats',
  description:
    'AI-powered property valuation for Dubai and UAE off-plan projects. Fair value estimates, comparables, market signals, and price trend analytics on the AIShield Intelligence Platform.',
  keywords: [
    'Dubai property valuation',
    'AI property valuation',
    'Dubai property fair value',
    'UAE property investment analysis',
    'off-plan project analysis',
  ].join(', '),
  openGraph: {
    title: 'AIShield™ — AI Property Intelligence | MillionFlats',
    description: 'Compare project valuations, fair value, and market signals across Dubai & UAE.',
    type: 'website',
  },
  alternates: {
    canonical: '/ai/shield',
  },
}

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-[#f4f6f9] animate-pulse">
      <div className="h-48 bg-[#0a1628]" />
      <div className="container mx-auto max-w-[1600px] px-4 py-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 h-96 bg-white rounded-2xl" />
        <div className="lg:col-span-9 h-[500px] bg-white rounded-2xl" />
      </div>
    </div>
  )
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is AIShield property valuation?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIShield is an AI-powered price intelligence platform that estimates fair market value for Dubai and UAE properties using comparable sales, market listings, and trend data.',
      },
    },
    {
      '@type': 'Question',
      name: 'How accurate is Dubai property fair value on AIShield?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Estimates include a confidence score based on comparable count, data quality, and market signal strength. Results are cached and refreshed regularly.',
      },
    },
  ],
}

const analysisJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'AIShield™',
  applicationCategory: 'RealEstateApplication',
  description: 'AI property valuation and market intelligence for Dubai and UAE real estate.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'AED',
  },
}

export default function AIShieldPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(analysisJsonLd) }}
      />
      <Suspense fallback={<DashboardFallback />}>
        <AIShieldDashboard />
      </Suspense>
    </>
  )
}
