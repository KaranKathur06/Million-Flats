import Image from 'next/image'
import Link from 'next/link'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'
import { partnerProfileUrl } from '@/lib/ecosystem/partnerProfile'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

type Props = {
  categorySlug: EcosystemCategorySlug
  limit?: number
  badge?: string
  title?: string
  exploreHref?: string
}

/** CMS-driven featured partner cards for bespoke category page sidebars. */
export default async function EcosystemFeaturedPartnersSection({
  categorySlug,
  limit = 6,
  badge = 'Top Design Studios',
  title = 'Featured Partners',
  exploreHref = '#directory',
}: Props) {
  const { items } = await fetchPublicPartners({
    categorySlug,
    page: 1,
    take: limit,
    featuredOnly: true,
  })

  if (items.length === 0) {
    const { items: fallback } = await fetchPublicPartners({
      categorySlug,
      page: 1,
      take: limit,
    })
    if (fallback.length === 0) return null
    return (
      <FeaturedGrid
        partners={fallback}
        categorySlug={categorySlug}
        badge={badge}
        title={title}
        exploreHref={exploreHref}
      />
    )
  }

  return (
    <FeaturedGrid
      partners={items}
      categorySlug={categorySlug}
      badge={badge}
      title={title}
      exploreHref={exploreHref}
    />
  )
}

function FeaturedGrid({
  partners,
  categorySlug,
  badge,
  title,
  exploreHref,
}: {
  partners: Awaited<ReturnType<typeof fetchPublicPartners>>['items']
  categorySlug: EcosystemCategorySlug
  badge: string
  title: string
  exploreHref: string
}) {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-2">{badge}</div>
          <h2 className="text-4xl font-sans font-extrabold text-[#111827] tracking-tight">{title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {partners.map((p) => {
          const href = p.slug ? partnerProfileUrl(categorySlug, p.slug) : exploreHref
          const image = p.coverImage || p.logo
          return (
            <Link
              key={p.id}
              href={href}
              className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-rose-200 hover:shadow-md transition-all"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {image ? (
                  <Image src={image} alt={p.name} fill className="object-cover" sizes="64px" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#111827] truncate group-hover:text-rose-600">{p.name}</div>
                {p.shortDescription ? (
                  <div className="text-sm text-slate-500 line-clamp-2 mt-1">{p.shortDescription}</div>
                ) : null}
                {p.isVerified ? (
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Verified</div>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 text-center sm:text-left">
        <Link
          href={exploreHref}
          className="text-rose-600 font-bold hover:text-rose-700 hover:underline flex items-center sm:justify-start justify-center gap-2"
        >
          Explore The Partner Directory
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
