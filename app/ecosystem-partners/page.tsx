import Link from 'next/link'
import { ECOSYSTEM_CATEGORIES, categoryHref } from '@/lib/ecosystemPartners'
import InternalPageBanner from '@/components/InternalPageBanner'

export const metadata = {
  title: 'Ecosystem Partners | MillionFlats',
  description:
    'Discover curated ecosystem partners across finance, legal, insurance, interiors, moving, property management, and Vastu/Feng Shui—verified by MillionFlats.',
}

export default function EcosystemPartnersLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageBanner
        title="Ecosystem Partners"
        description="Curated, verified partners across finance, legal, insurance, interiors, moving, management, and more."
        image={{ src: '/HOMEPAGE.jpg', alt: 'Ecosystem Partners' }}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Ecosystem', href: '/ecosystem-partners' }]}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl">
          <div className="sr-only">
            <h1>Ecosystem Partners</h1>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ECOSYSTEM_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={categoryHref(c.slug)}
                className="group rounded-2xl border border-gray-200 bg-white p-6 hover:border-dark-blue/30 hover:shadow-sm transition"
              >
                <div className="text-xl font-semibold text-gray-900 group-hover:text-dark-blue">{c.name}</div>
                <div className="mt-2 text-sm text-gray-600">{c.description}</div>
                <div className="mt-4 text-sm font-semibold text-dark-blue group-hover:underline">Explore</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
