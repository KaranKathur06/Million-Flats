'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export type EcosystemPartnerCard = {
  id: string
  name: string
  logo?: string | null
  shortDescription?: string | null
  rating?: number | null
  yearsExperience?: number | null
  locationCoverage?: string | null
  isFeatured?: boolean
  isVerified?: boolean
}

function stars(rating: number) {
  const r = Math.max(0, Math.min(5, rating))
  const full = Math.floor(r)
  const half = r - full >= 0.5
  const total = 5
  return { full, half, empty: total - full - (half ? 1 : 0) }
}

export default function EcosystemPartnerGrid({
  partners,
  slug,
}: {
  partners: EcosystemPartnerCard[]
  slug: string
}) {
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)

  const filtered = useMemo(() => {
    return partners.filter((p) => {
      if (featuredOnly && !p.isFeatured) return false
      const r = typeof p.rating === 'number' ? p.rating : 0
      if (minRating > 0 && r < minRating) return false
      return true
    })
  }, [partners, featuredOnly, minRating])

  return (
    <section className="py-12" id="partners">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">Partner Directory</h2>
            <p className="mt-2 text-sm text-gray-600">
              Browse verified partners. Filter by rating and featured placements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFeaturedOnly((v) => !v)}
              className={`h-10 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                featuredOnly
                  ? 'border-dark-blue bg-dark-blue text-white'
                  : 'border-gray-200 bg-white text-dark-blue hover:bg-gray-50'
              }`}
            >
              Featured only
            </button>

            <select
              value={String(minRating)}
              onChange={(e) => setMinRating(Number(e.target.value) || 0)}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
            >
              <option value="0">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8">
            <div className="text-sm font-semibold text-gray-900">No partners available yet</div>
            <div className="mt-2 text-sm text-gray-600">
              We’re onboarding verified partners for this category. Request a consultation and we’ll contact you.
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const rating = typeof p.rating === 'number' ? p.rating : 0
              const s = stars(rating)
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {p.logo ? (
                      <Image
                        src={p.logo}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        loading="lazy"
                      />
                    ) : null}
                    {p.isVerified ? (
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-dark-blue border border-white/60">
                        Verified
                      </div>
                    ) : null}
                    {p.isFeatured ? (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-accent-yellow text-dark-blue">
                        Featured
                      </div>
                    ) : null}
                  </div>

                  <div className="p-6">
                    <div className="text-base font-semibold text-dark-blue">{p.name}</div>
                    {p.shortDescription ? <div className="mt-2 text-sm text-gray-600">{p.shortDescription}</div> : null}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        {Array.from({ length: s.full }).map((_, i) => (
                          <span key={`f-${i}`}>★</span>
                        ))}
                        {s.half ? <span>★</span> : null}
                        {Array.from({ length: s.empty }).map((_, i) => (
                          <span key={`e-${i}`} className="text-gray-300">
                            ★
                          </span>
                        ))}
                        <span className="ml-2 text-gray-600">{rating ? rating.toFixed(1) : 'New'}</span>
                      </div>

                      {p.yearsExperience ? (
                        <div className="text-xs font-semibold text-gray-600">{p.yearsExperience}+ yrs</div>
                      ) : null}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Link
                        href={`/ecosystem-partners/${slug}#lead`}
                        onClick={() => trackEvent('ecosystem_partner_contact_click', { slug, partnerId: p.id, partner: p.name })}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90"
                      >
                        Contact
                      </Link>
                      <Link
                        href={`/ecosystem-partners/${slug}#partners`}
                        onClick={() => trackEvent('ecosystem_partner_view_profile_click', { slug, partnerId: p.id, partner: p.name })}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white text-dark-blue text-sm font-semibold hover:bg-gray-50"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
