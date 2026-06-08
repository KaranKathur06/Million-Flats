import Link from 'next/link'
import Image from 'next/image'
import type { RecommendedPartner } from '@/lib/ecosystem/getRecommendedPartners'
import { partnerProfileUrl } from '@/lib/ecosystem/partnerProfile'

type EcosystemPartnerCardCompactProps = {
  partner: RecommendedPartner
  variant?: 'inline' | 'card'
}

export default function EcosystemPartnerCardCompact({
  partner,
  variant = 'card',
}: EcosystemPartnerCardCompactProps) {
  const href = partnerProfileUrl(partner.categorySlug, partner.slug)

  const inner = (
    <div className="flex items-center gap-3.5">
      {partner.logo ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
          <Image src={partner.logo} alt={partner.name} fill className="object-cover" sizes="48px" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-base font-bold text-dark-blue">
          {partner.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-gray-900">{partner.name}</p>
          {partner.isVerified && (
            <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              Verified
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{partner.categoryTitle}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-gray-400">
          {partner.rating != null && partner.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              ★ {partner.rating.toFixed(1)}
            </span>
          )}
          {partner.yearsExperience != null && partner.yearsExperience > 0 && (
            <span>{partner.yearsExperience}+ yrs</span>
          )}
          {partner.locationCoverage && (
            <span className="truncate">{partner.locationCoverage.split(',')[0]}</span>
          )}
        </div>
      </div>
      <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-gray-200 bg-white p-3.5 transition-all hover:border-dark-blue/20 hover:shadow-md"
      >
        {inner}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-dark-blue/20 hover:shadow-md"
    >
      {partner.coverImage && (
        <div className="relative aspect-[16/7] bg-gray-100">
          <Image
            src={partner.coverImage}
            alt={partner.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}
      <div className="p-4">{inner}</div>
    </Link>
  )
}
