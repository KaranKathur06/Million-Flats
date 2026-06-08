import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How AIShield Works | MillionFlats',
  description:
    'Learn how AIShield™ analyzes comparable sales, market trends, and demand signals to deliver fair value estimates for Dubai and UAE properties.',
}

const FEATURES = [
  {
    icon: '🎯',
    title: 'Fair Market Valuation',
    description:
      'Statistical engine analyzing comparable sales, market listings, and location-specific data to estimate true value range.',
  },
  {
    icon: '📊',
    title: 'Price Trend Analysis',
    description: '12-month price trend visualization with area-level price-per-sqft movements.',
  },
  {
    icon: '🏘️',
    title: 'Comparable Properties',
    description: 'Similarity-scored comparables within the same community, ranked by distance and configuration.',
  },
  {
    icon: '📡',
    title: 'Market Signals',
    description: 'Demand score, supply analysis, listing velocity, and days-on-market metrics.',
  },
]

export default function AIShieldAboutPage() {
  return (
    <div className="min-h-screen bg-[#fafaf8] py-16">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900">How AIShield™ Works</h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          AIShield is MillionFlats&apos; dedicated AI Intelligence Platform. Browse enabled projects,
          compare valuations, and open full analysis on{' '}
          <a href="/ai/shield" className="text-blue-600 font-semibold hover:underline">
            /ai/shield
          </a>
          .
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <span className="text-2xl">{f.icon}</span>
              <h2 className="font-bold text-gray-900 mt-2">{f.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
