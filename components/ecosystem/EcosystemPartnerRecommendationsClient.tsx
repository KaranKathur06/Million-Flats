'use client'

import Link from 'next/link'
import type { RecommendationGroup } from '@/lib/ecosystem/getRecommendedPartners'
import EcosystemPartnerCardCompact from './EcosystemPartnerCardCompact'

type Props = {
  groups: RecommendationGroup[]
  layout?: 'sidebar' | 'full'
  className?: string
}

export default function EcosystemPartnerRecommendationsClient({
  groups,
  layout = 'sidebar',
  className = '',
}: Props) {
  if (groups.length === 0) return null

  if (layout === 'full') {
    return (
      <section className={`py-12 sm:py-14 ${className}`}>
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-dark-blue/60">MillionFlats Ecosystem</p>
            <h2 className="mt-2 text-2xl font-bold text-dark-blue sm:text-3xl">Recommended Partners</h2>
            <p className="mt-2 text-sm text-gray-600">
              Continue your property journey with verified ecosystem partners.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.categorySlug}>
                <h3 className="text-base font-bold text-dark-blue">{group.headline}</h3>
                <p className="mt-1 mb-3 text-sm text-gray-600">{group.description}</p>
                {group.partners.map((partner) => (
                  <EcosystemPartnerCardCompact key={partner.id} partner={partner} variant="card" />
                ))}
                <Link href={group.directoryHref} className="mt-3 inline-flex text-sm font-semibold text-dark-blue hover:underline">
                  Browse {group.categoryTitle} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-dark-blue/5 to-white p-5">
        <h4 className="text-sm font-bold text-dark-blue">MillionFlats Ecosystem</h4>
        <p className="mt-1 text-xs text-gray-600">Verified partners for your property journey.</p>
      </div>
      {groups.map((group) => (
        <div key={group.categorySlug} className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-dark-blue/80">{group.headline}</p>
          <p className="mt-1 mb-3 text-xs text-gray-500">{group.description}</p>
          {group.partners.map((partner) => (
            <div key={partner.id} className="mb-2">
              <EcosystemPartnerCardCompact partner={partner} variant="inline" />
            </div>
          ))}
          <Link href={group.directoryHref} className="text-xs font-semibold text-dark-blue hover:underline">
            View all partners →
          </Link>
        </div>
      ))}
    </div>
  )
}
