 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CountryCode } from '@/lib/country'
import useProperties from '@/app/properties/useProperties'
import PropertiesHero from '@/components/properties/PropertiesHero'
import SmartSearch from '@/components/properties/SmartSearch'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'
import FiltersPanel from '@/components/properties/FiltersPanel'
import PropertiesGrid from '@/components/properties/PropertiesGrid'
import {
  BATHROOM_PLUS_FILTER_OPTIONS,
  BEDROOM_PLUS_FILTER_OPTIONS,
  COUNTRY_FILTER_OPTIONS,
  LISTING_SORT_COMPACT_OPTIONS,
  PROPERTY_TYPE_COMPACT_OPTIONS,
  PROPERTY_TYPE_FILTER_OPTIONS,
  priceFilterOptions,
} from '@/lib/filters/dropdownOptions'

interface Property {
  id: string
  country: 'UAE' | 'INDIA'
  title: string
  location: string
  price: number
  currency?: string
  href?: string
  intent: 'BUY' | 'RENT'
  pricingFrequency?: string
  yearBuilt?: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  images: string[]
  featured: boolean
  propertyType: string
  agent?: {
    id: string
    name: string
    email: string
    phone: string
    avatar?: string
  }
}

type Filters = {
  country: CountryCode
  search: string
  location: string
  community: string
  type: string
  minPrice: string
  maxPrice: string
  bedrooms: string
  bathrooms: string
  sortBy: string
  offPlanOnly: boolean
  readyHomesOnly: boolean
  soldOnly: boolean
}

type Purpose = 'buy' | 'rent'

function safePurpose(v: unknown): Purpose {
  return v === 'rent' ? 'rent' : 'buy'
}

export default function PropertiesClient({ forcedPurpose }: { forcedPurpose?: Purpose }) {
  const cityRefMobile = useRef<HTMLDivElement>(null)
  const cityRefDesktop = useRef<HTMLDivElement>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')

  const [communityOpen, setCommunityOpen] = useState(false)
  const [communityQuery, setCommunityQuery] = useState('')
  const communityRefMobile = useRef<HTMLDivElement>(null)
  const communityRefDesktop = useRef<HTMLDivElement>(null)

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [moreFiltersVisible, setMoreFiltersVisible] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false)

  const [mobileFiltersEl, setMobileFiltersEl] = useState<HTMLDivElement | null>(null)

  const {
    properties,
    loading,
    apiError,
    page,
    limit,
    totalCount,
    setPage,
    setLimit,
    filters,
    setFilters,
    draftFilters,
    setDraftFilters,
    purpose,
    setPurpose,
    applyDraft,
    resetFilters,
    fetchProperties,
    priceOptions,
    minPriceDropdownOptions,
    maxPriceDropdownOptions,
    minPriceDrawerOptions,
    maxPriceDrawerOptions,
    cities,
    communities,
  } = useProperties(forcedPurpose)

  // Data and URL sync handled by `useProperties` hook

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      const inCityMobile = cityRefMobile.current?.contains(target) ?? false
      const inCityDesktop = cityRefDesktop.current?.contains(target) ?? false
      const inCommunityMobile = communityRefMobile.current?.contains(target) ?? false
      const inCommunityDesktop = communityRefDesktop.current?.contains(target) ?? false
      const inside = inCityMobile || inCityDesktop || inCommunityMobile || inCommunityDesktop
      if (!inside) {
        setCityOpen(false)
        setCommunityOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const openMoreFilters = () => {
    setMoreFiltersOpen(true)
    requestAnimationFrame(() => setMoreFiltersVisible(true))
  }

  const closeMoreFilters = () => {
    setMoreFiltersVisible(false)
    window.setTimeout(() => setMoreFiltersOpen(false), 220)
  }

  const openMobileFilters = () => {
    setMobileFiltersOpen(true)
    requestAnimationFrame(() => setMobileFiltersVisible(true))
  }

  const closeMobileFilters = () => {
    setMobileFiltersVisible(false)
    window.setTimeout(() => setMobileFiltersOpen(false), 220)
  }

  useEffect(() => {
    if (!mobileFiltersOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileFilters()

      if (e.key === 'Tab' && mobileFiltersEl) {
        const focusables = Array.from(
          mobileFiltersEl.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)

        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (e.shiftKey) {
          if (!active || active === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)

    window.setTimeout(() => {
      const btn = mobileFiltersEl?.querySelector<HTMLElement>('button[aria-label="Close"]')
      btn?.focus()
    }, 0)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileFiltersEl, mobileFiltersOpen])

  // Data fetching and filter handlers are provided by the hook
  const communityOptions = communities

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return cities
    return (cities as string[]).filter((c: string) => c.toLowerCase().includes(q))
  }, [cities, cityQuery])

  const filteredCommunities = useMemo(() => {
    const q = communityQuery.trim().toLowerCase()
    if (!q) return communityOptions
    return communityOptions.filter((c) => c.toLowerCase().includes(q))
  }, [communityOptions, communityQuery])

  const displayedProperties = properties

  // Price options provided by `useProperties` hook

  const heroTitle = forcedPurpose === 'rent' ? 'Find Your Next Home' : 'Discover Premium Properties'
  const heroSubtitle =
    forcedPurpose === 'rent'
      ? 'Discover rental properties across India and the UAE. Search by location, property type, configuration, rent and lifestyle preferences.'
      : 'Browse properties available for purchase across India and the UAE. Search by location, property type, configuration, budget and more.'

  const breadcrumbLabel = purpose === 'rent' ? 'Rent' : 'Buy'
  const breadcrumbHref = purpose === 'rent' ? '/rent' : '/buy'

  return (
    <div className="min-h-screen bg-gray-50">
      <PropertiesHero
        title={heroTitle}
        subtitle={heroSubtitle}
        image={{ src: '/HOMEPAGE.jpg', alt: heroTitle }}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: breadcrumbLabel, href: breadcrumbHref }]}
      />

      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <p className="text-gray-600">{(totalCount ?? displayedProperties.length).toLocaleString()} properties found</p>
        </div>

        <div className="sticky top-14 md:top-20 z-30 mb-6 md:mb-10">
          <div className="space-y-3">
            <div className="relative z-20 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-full md:w-[320px]">
                  <SmartSearch draftFilters={draftFilters} setDraftFilters={setDraftFilters} onSearch={applyDraft} purpose={purpose} />
                </div>

                <div className="relative w-full md:w-[240px]" ref={cityRefDesktop}>
                  <input
                    value={cityQuery !== '' ? cityQuery : draftFilters.location}
                    onChange={(e) => {
                      setCityQuery(e.target.value)
                      setCityOpen(true)
                    }}
                    onFocus={() => setCityOpen(true)}
                    placeholder="City"
                    className="w-full h-12 md:h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                  />
                  {cityOpen && filteredCities.length > 0 && (
                    <div className="absolute z-[70] mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {filteredCities.slice(0, 10).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setDraftFilters((prev) => ({ ...prev, location: c, community: '' }))
                            setCityQuery('')
                            setCommunityQuery('')
                            setCityOpen(false)
                            setCommunityOpen(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative w-full md:flex-1" ref={communityRefDesktop}>
                  <input
                    value={communityQuery !== '' ? communityQuery : draftFilters.community}
                    onChange={(e) => {
                      setCommunityQuery(e.target.value)
                      setCommunityOpen(true)
                    }}
                    onFocus={() => {
                      if (!draftFilters.location) return
                      setCommunityOpen(true)
                    }}
                    placeholder={draftFilters.location ? 'Community / Area' : 'Select City First'}
                    disabled={!draftFilters.location || communityOptions.length === 0}
                    className="w-full h-12 md:h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {communityOpen && filteredCommunities.length > 0 && (
                    <div className="absolute z-[70] mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {filteredCommunities.slice(0, 10).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setDraftFilters((prev) => ({ ...prev, community: c }))
                            setCommunityQuery('')
                            setCommunityOpen(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:hidden flex gap-2">
                  <button
                    type="button"
                    onClick={openMobileFilters}
                    className="h-12 flex-1 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                  >
                    Filters
                  </button>
                  <button
                    type="button"
                    onClick={applyDraft}
                    className="h-12 w-12 rounded-full bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors inline-flex items-center justify-center"
                    aria-label="Search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative z-10 hidden md:block bg-white/85 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-3">
              <div className="flex flex-wrap items-center gap-2">
                {!forcedPurpose ? (
                  <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPurpose('buy')}
                      className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                        purpose === 'buy' ? 'bg-dark-blue text-white' : 'text-dark-blue hover:bg-gray-50'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurpose('rent')}
                      className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                        purpose === 'rent' ? 'bg-dark-blue text-white' : 'text-dark-blue hover:bg-gray-50'
                      }`}
                    >
                      Rent
                    </button>
                  </div>
                ) : null}

                <GlobalDropdown
                  label="Property Type"
                  showLabel={false}
                  value={draftFilters.type}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, type: singleDropdownValue(v) }))}
                  options={PROPERTY_TYPE_COMPACT_OPTIONS}
                  appearance="admin-light"
                  dense
                  className="min-w-[170px]"
                />

                <GlobalDropdown
                  label="Min Price"
                  showLabel={false}
                  value={draftFilters.minPrice}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, minPrice: singleDropdownValue(v) }))}
                  options={minPriceDropdownOptions}
                  appearance="admin-light"
                  dense
                  className="min-w-[150px]"
                />

                <GlobalDropdown
                  label="Max Price"
                  showLabel={false}
                  value={draftFilters.maxPrice}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, maxPrice: singleDropdownValue(v) }))}
                  options={maxPriceDropdownOptions}
                  appearance="admin-light"
                  dense
                  className="min-w-[150px]"
                />

                <GlobalDropdown
                  label="Beds"
                  showLabel={false}
                  value={draftFilters.bedrooms}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, bedrooms: singleDropdownValue(v) }))}
                  options={BEDROOM_PLUS_FILTER_OPTIONS}
                  appearance="admin-light"
                  dense
                  className="min-w-[120px]"
                />

                <GlobalDropdown
                  label="Baths"
                  showLabel={false}
                  value={draftFilters.bathrooms}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, bathrooms: singleDropdownValue(v) }))}
                  options={BATHROOM_PLUS_FILTER_OPTIONS}
                  appearance="admin-light"
                  dense
                  className="min-w-[120px]"
                />

                <button
                  type="button"
                  onClick={openMoreFilters}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                >
                  More Filters
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                >
                  Reset
                </button>

                <GlobalDropdown
                  label="Sort"
                  showLabel={false}
                  value={draftFilters.sortBy}
                  onChange={(v) => setDraftFilters((prev) => ({ ...prev, sortBy: singleDropdownValue(v) }))}
                  options={LISTING_SORT_COMPACT_OPTIONS}
                  appearance="admin-light"
                  dense
                  className="min-w-[160px]"
                />

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={applyDraft}
                  className="h-11 w-11 rounded-full bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors inline-flex items-center justify-center"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {moreFiltersOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button
              type="button"
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                moreFiltersVisible ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Close"
              onClick={closeMoreFilters}
            />
            <div
              className={`relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 transition-all duration-200 ${
                moreFiltersVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-dark-blue">More Filters</h2>
                <button
                  type="button"
                  onClick={closeMoreFilters}
                  className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                  <input
                    type="checkbox"
                    checked={draftFilters.offPlanOnly}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, offPlanOnly: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-dark-blue">Off Plan Only</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                  <input
                    type="checkbox"
                    checked={draftFilters.readyHomesOnly}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, readyHomesOnly: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-dark-blue">Ready Homes Only</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                  <input
                    type="checkbox"
                    checked={draftFilters.soldOnly}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, soldOnly: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-dark-blue">Sold Only</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeMoreFilters}
                  className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMoreFilters()
                    applyDraft()
                  }}
                  className="h-11 px-5 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90 transition-colors"
                >
                  Update Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <FiltersPanel
          open={mobileFiltersOpen}
          visible={mobileFiltersVisible}
          close={closeMobileFilters}
          forcedPurpose={forcedPurpose}
          purpose={purpose}
          setPurpose={setPurpose}
          draftFilters={draftFilters}
          setDraftFilters={setDraftFilters}
          minPriceDrawerOptions={minPriceDrawerOptions}
          maxPriceDrawerOptions={maxPriceDrawerOptions}
          BEDROOM_PLUS_FILTER_OPTIONS={BEDROOM_PLUS_FILTER_OPTIONS}
          BATHROOM_PLUS_FILTER_OPTIONS={BATHROOM_PLUS_FILTER_OPTIONS}
          PROPERTY_TYPE_FILTER_OPTIONS={PROPERTY_TYPE_FILTER_OPTIONS}
          LISTING_SORT_COMPACT_OPTIONS={LISTING_SORT_COMPACT_OPTIONS}
          resetFilters={resetFilters}
          applyDraft={applyDraft}
          openMoreFilters={openMoreFilters}
          setRef={setMobileFiltersEl}
        />

        <PropertiesGrid
          properties={displayedProperties}
          loading={loading}
          error={apiError}
          variant="grid"
        />

        {totalCount !== null && totalCount > 0 && (
          <div className="mt-6 flex justify-center items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Per page</label>
              <select
                value={limit}
                onChange={(e) => {
                  const v = Number(e.target.value) || 24
                  setLimit(v)
                  setPage(1)
                }}
                className="h-9 px-3 rounded-lg border bg-white text-sm"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>

            <nav className="inline-flex items-center gap-2" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
              >
                Prev
              </button>

              {(() => {
                const totalPages = Math.max(1, Math.ceil((totalCount || 0) / limit))
                const pages: number[] = []
                const start = Math.max(1, page - 2)
                const end = Math.min(totalPages, page + 2)
                if (start > 1) pages.push(1)
                if (start > 2) pages.push(-1)
                for (let i = start; i <= end; i++) pages.push(i)
                if (end < totalPages - 1) pages.push(-1)
                if (end < totalPages) pages.push(totalPages)

                return pages.map((p) =>
                  p === -1 ? (
                    <span key={Math.random()} className="px-2 text-sm text-gray-500">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      disabled={p === page || loading}
                      className={`px-3 py-2 rounded-lg border text-sm ${p === page ? 'bg-dark-blue text-white' : 'bg-white'}`}
                    >
                      {p}
                    </button>
                  )
                )
              })()}

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil((totalCount || 0) / limit) || loading}
                className="px-3 py-2 rounded-lg border bg-white text-sm disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}
