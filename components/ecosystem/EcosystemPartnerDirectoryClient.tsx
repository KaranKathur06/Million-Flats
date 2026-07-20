'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import MillionFlatsButton from '@/components/ui/MillionFlatsButton'
import { trackEvent } from '@/lib/tracking'
import { partnerProfileUrl } from '@/lib/ecosystem/partnerProfile'

export type EcosystemPartnerCard = {
  id: string
  name: string
  slug?: string | null
  logo?: string | null
  coverImage?: string | null
  shortDescription?: string | null
  rating?: number | null
  yearsExperience?: number | null
  projectsCompleted?: number | null
  locationCoverage?: string | null
  pricingRange?: string | null
  isFeatured?: boolean
  isVerified?: boolean
}

function stars(rating: number) {
  const r = Math.max(0, Math.min(5, rating))
  const full = Math.floor(r)
  const half = r - full >= 0.5
  return { full, half, empty: 5 - full - (half ? 1 : 0) }
}

export default function EcosystemPartnerDirectoryClient({
  partners,
  slug,
  categoryTitle,
  initialPage,
  take,
  total,
  hasMore,
}: {
  partners: EcosystemPartnerCard[]
  slug: string
  categoryTitle: string
  initialPage: number
  take: number
  total: number
  hasMore: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [budgetFilter, setBudgetFilter] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)

  const [items, setItems] = useState<EcosystemPartnerCard[]>(partners)
  const [page, setPage] = useState(initialPage)
  const [busy, setBusy] = useState(false)
  const [hasMoreState, setHasMoreState] = useState(hasMore)
  const [totalState, setTotalState] = useState(total)

  const updateUrlPage = (nextPage: number) => {
    const sp = new URLSearchParams(searchParams?.toString() || '')
    if (nextPage <= 1) sp.delete('page')
    else sp.set('page', String(nextPage))
    const qs = sp.toString()
    router.replace(qs ? `?${qs}#partners` : `#partners`)
  }

  const fetchPage = async (nextPage: number, mode: 'replace' | 'append') => {
    if (busy) return
    setBusy(true)
    try {
      const u = new URL('/api/ecosystem/partners', window.location.origin)
      u.searchParams.set('slug', slug)
      u.searchParams.set('page', String(nextPage))
      u.searchParams.set('take', String(take))
      if (featuredOnly) u.searchParams.set('featuredOnly', 'true')
      if (minRating > 0) u.searchParams.set('minRating', String(minRating))
      if (search.trim()) u.searchParams.set('search', search.trim())
      if (locationFilter) u.searchParams.set('location', locationFilter)
      if (budgetFilter) u.searchParams.set('budget', budgetFilter)

      const res = await fetch(u.toString(), { method: 'GET' })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) throw new Error(String(json?.message || 'Request failed'))

      const newItems = (Array.isArray(json.items) ? json.items : []) as EcosystemPartnerCard[]
      setItems((prev) => (mode === 'append' ? [...prev, ...newItems] : newItems))
      setPage(nextPage)
      setHasMoreState(Boolean(json.hasMore))
      setTotalState(Number(json.total) || 0)
      updateUrlPage(nextPage)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      trackEvent('ecosystem_partner_load_more_error', { slug, message: msg })
    } finally {
      setBusy(false)
    }
  }

  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach((p) => {
      if (p.locationCoverage) {
        p.locationCoverage.split(',').forEach((s) => {
          const v = s.trim()
          if (v) set.add(v)
        })
      }
    })
    return Array.from(set).sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (featuredOnly && !p.isFeatured) return false
      const r = typeof p.rating === 'number' ? p.rating : 0
      if (minRating > 0 && r < minRating) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const hay = `${p.name} ${p.shortDescription || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (locationFilter && !p.locationCoverage?.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false
      }
      if (budgetFilter && p.pricingRange && !p.pricingRange.includes(budgetFilter)) return false
      return true
    })
  }, [items, featuredOnly, minRating, search, locationFilter, budgetFilter])

  return (
    <section className="bg-white py-24" id="partners">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">Directory</p>
            <h2 className="mt-4 text-[38px] font-extrabold leading-tight text-slate-950 sm:text-[42px]">
              {categoryTitle} Directory
            </h2>
            <p className="mt-4 text-[18px] leading-8 text-slate-600">
              Browse verified partners. All inquiries route through MillionFlats — no direct contact details shown.
            </p>
          </div>
        </div>

        <div className="mb-10 rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search partners..."
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-900 outline-none transition focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/15 lg:col-span-2"
            />
            <GlobalDropdown
              label="Location"
              showLabel={false}
              value={locationFilter}
              onChange={(v) => setLocationFilter(typeof v === 'string' ? v : v[0] || '')}
              placeholder="All Locations"
              options={[{ value: '', label: 'All Locations' }, ...locationOptions.map((loc) => ({ value: loc, label: loc }))]}
              appearance="admin-light"
            />
            <GlobalDropdown
              label="Budget"
              showLabel={false}
              value={budgetFilter}
              onChange={(v) => setBudgetFilter(typeof v === 'string' ? v : v[0] || '')}
              placeholder="Budget Range"
              options={[
                { value: '', label: 'Budget Range' },
                { value: '₹5L', label: '₹5L - ₹15L' },
                { value: '₹15L', label: '₹15L - ₹50L' },
                { value: '₹50L', label: '₹50L+' },
              ]}
              appearance="admin-light"
            />
            <GlobalDropdown
              label="Rating"
              showLabel={false}
              value={String(minRating)}
              onChange={(v) => setMinRating(Number(typeof v === 'string' ? v : v[0]) || 0)}
              placeholder="Any Rating"
              options={[
                { value: '0', label: 'Any Rating' },
                { value: '3', label: '3+ stars' },
                { value: '4', label: '4+ stars' },
                { value: '4.5', label: '4.5+ stars' },
              ]}
              appearance="admin-light"
            />
            <button
              type="button"
              onClick={() => {
                const next = !featuredOnly
                setFeaturedOnly(next)
                fetchPage(1, 'replace')
              }}
              className={`h-12 rounded-xl border text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                featuredOnly
                  ? 'border-dark-blue bg-dark-blue text-white'
                  : 'border-gray-200 bg-white text-dark-blue hover:bg-slate-100 hover:border-dark-blue/30'
              }`}
            >
              Featured
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border border-slate-200 bg-white text-dark-blue shadow-sm">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10.5 18a7.5 7.5 0 117.5-7.5M16 16l5 5M7.5 9h6M7.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-lg font-extrabold text-slate-950">
              {items.length === 0 ? 'No verified partners listed yet' : 'No partners match your filters'}
            </div>
            <div className="mx-auto mt-3 max-w-xl text-[16px] leading-7 text-slate-600">
              {items.length === 0
                ? 'We are onboarding partners for this category. Request a consultation and our team will connect you with the right expert.'
                : "Try adjusting filters or request a consultation and we'll connect you."}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => {
                const rating = typeof p.rating === 'number' ? p.rating : 0
                const s = stars(rating)
                const profileHref = p.slug ? partnerProfileUrl(slug, p.slug) : `#partners`
                const image = p.coverImage || p.logo

                return (
                  <article
                    key={p.id}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-dark-blue/20 hover:shadow-[0_26px_80px_rgba(15,23,42,0.10)]"
                  >
                    <div className="relative aspect-[16/10] bg-gray-100">
                      {image ? (
                        <Image
                          src={image}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {p.isVerified && (
                        <div className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-dark-blue">
                          Verified
                        </div>
                      )}
                      {p.isFeatured && (
                        <div className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-dark-blue">
                          Featured
                        </div>
                      )}
                      {p.logo && p.coverImage && (
                        <div className="absolute bottom-3 left-3 h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md">
                          <Image src={p.logo} alt="" fill className="object-cover" sizes="48px" />
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-extrabold text-slate-950">{p.name}</h3>
                      {p.shortDescription && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.shortDescription}</p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1 text-amber-600">
                          {Array.from({ length: s.full }).map((_, i) => (
                            <span key={`f-${i}`}>★</span>
                          ))}
                          <span className="ml-1 text-gray-600">{rating ? rating.toFixed(1) : 'New'}</span>
                        </span>
                        {p.yearsExperience ? <span>{p.yearsExperience}+ yrs</span> : null}
                        {p.projectsCompleted ? <span>{p.projectsCompleted}+ projects</span> : null}
                        {p.locationCoverage ? (
                          <span className="truncate">{p.locationCoverage.split(',')[0]}</span>
                        ) : null}
                      </div>

                      <div className="mt-5 flex gap-2">
                          <MillionFlatsButton
                          href={profileHref}
                          variant="primary"
                          size="md"
                          className="flex-1"
                          onClick={() =>
                            trackEvent('ecosystem_partner_view_profile_click', {
                              slug,
                              partnerId: p.id,
                              partner: p.name,
                            })
                          }
                        >
                          View Profile
                        </MillionFlatsButton>
                        <MillionFlatsButton
                          href={p.slug ? `${profileHref}#partner-contact` : `#lead`}
                          variant="secondary"
                          size="md"
                          className="flex-1"
                          onClick={() =>
                            trackEvent('ecosystem_partner_contact_click', { slug, partnerId: p.id, partner: p.name })
                          }
                        >
                          Consult
                        </MillionFlatsButton>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-8 flex items-center justify-center">
              {hasMoreState ? (
                <MillionFlatsButton
                  type="button"
                  onClick={() => fetchPage(page + 1, 'append')}
                  variant="primary"
                  size="md"
                  className="inline-flex h-11 px-6 disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? 'Loading...' : 'Load More Partners'}
                </MillionFlatsButton>
              ) : (
                <div className="text-sm text-gray-600">
                  Showing {filtered.length} of {totalState}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
