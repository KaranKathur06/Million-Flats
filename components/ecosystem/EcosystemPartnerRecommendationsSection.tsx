import Link from 'next/link'
import {
  getRecommendationsForContext,
  type RecommendationGroup,
} from '@/lib/ecosystem/getRecommendedPartners'
import EcosystemPartnerCardCompact from './EcosystemPartnerCardCompact'

type EcosystemPartnerRecommendationsSectionProps = {
  context: 'project' | 'property' | 'developer'
  city?: string | null
  layout?: 'sidebar' | 'full'
  className?: string
}

export default async function EcosystemPartnerRecommendationsSection({
  context,
  city,
  layout = 'full',
  className = '',
}: EcosystemPartnerRecommendationsSectionProps) {
  const groups = await getRecommendationsForContext(context, {
    city: city || undefined,
    partnersPerCategory: 1,
  })

  if (groups.length === 0) return null

  if (layout === 'sidebar') {
    return <SidebarRecommendations groups={groups} className={className} />
  }

  return <FullRecommendations groups={groups} className={className} />
}

function SidebarRecommendations({
  groups,
  className,
}: {
  groups: RecommendationGroup[]
  className?: string
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h4 className="text-sm font-bold text-gray-900">MillionFlats Ecosystem</h4>
        <p className="mt-1 text-xs text-gray-500">Verified partners for your post-purchase journey.</p>
      </div>
      {groups.map((group) => (
        <div key={group.categorySlug} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-dark-blue/70">{group.headline}</p>
            <p className="mt-1 text-xs text-gray-500">{group.description}</p>
          </div>
          {group.partners.map((partner) => (
            <EcosystemPartnerCardCompact key={partner.id} partner={partner} variant="inline" />
          ))}
          <Link
            href={group.directoryHref}
            className="mt-3 inline-flex text-xs font-semibold text-dark-blue hover:underline"
          >
            View all {group.categoryTitle} partners →
          </Link>
        </div>
      ))}
    </div>
  )
}

function FullRecommendations({
  groups,
  className,
}: {
  groups: RecommendationGroup[]
  className?: string
}) {
  return (
    <section className={`py-12 sm:py-14 ${className}`}>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-dark-blue/60">MillionFlats Ecosystem</p>
          <h2 className="mt-2 text-2xl font-bold text-dark-blue sm:text-3xl">Recommended Partners</h2>
          <p className="mt-2 text-sm text-gray-600">
            Continue your property journey with verified ecosystem partners. All inquiries route through MillionFlats.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.categorySlug} className="flex flex-col">
              <div className="mb-3">
                <h3 className="text-base font-bold text-dark-blue">{group.headline}</h3>
                <p className="mt-1 text-sm text-gray-600">{group.description}</p>
              </div>
              {group.partners.map((partner) => (
                <EcosystemPartnerCardCompact key={partner.id} partner={partner} variant="card" />
              ))}
              <Link
                href={group.directoryHref}
                className="mt-3 text-sm font-semibold text-dark-blue hover:underline"
              >
                Browse {group.categoryTitle} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
