 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useCountry } from '@/components/CountryProvider'
import { CITIES_BY_COUNTRY, COUNTRY_META, DEFAULT_COUNTRY, isCountryCode, uiPriceToAed, type CountryCode } from '@/lib/country'
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
  features: string[]
}

const MORE_FEATURES = [
  'Private Pool',
  'Large Plot',
  'Brand New',
  'Vacant on Transfer',
  'Golf Course View',
  'Garden',
  'Beach Access',
  'Upgraded',
  'Close to Park',
  'Furnished',
  'Water Views',
  'Balcony',
  'Maid Room',
  'Gym',
] as const

type MoreFeature = (typeof MORE_FEATURES)[number]

const COMMUNITIES_BY_CITY: Record<string, readonly string[]> = {
  Dubai: [
    'Jumeirah Village Circle',
    'Business Bay',
    'Dubai Marina',
    'Dubai South',
    'Dubai Hills Estate',
    'DAMAC Hills',
    'Al Furjan',
    'Wadi Al Safa 5',
  ],
  'Abu Dhabi': [
    'Mohammed Bin Zayed City',
    'Al Raha Beach',
    'Khalifa City A & B',
    'Al Maryah Island',
    'Yas Island',
    'Al Ghadeer',
  ],
  Sharjah: ['Al Nahda (Sharjah)', 'Muwaileh Commercial'],
  Ajman: ['Al Nuaimiya', 'Ajman Downtown', 'Emirates City', 'Al Rawda'],
  'Ras Al Khaimah': ['Al Hamra Village', 'Al Nakheel'],
}

function hashToIndex(input: string, length: number) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return length === 0 ? 0 : Math.abs(h) % length
}

function deriveCommunity(location: string, propertyId: string) {
  const opts = COMMUNITIES_BY_CITY[location] || []
  if (opts.length === 0) return ''
  return opts[hashToIndex(`${location}:${propertyId}`, opts.length)]
}

function deriveAnnualRentAed(salePriceAed: number) {
  return Math.max(1, Math.round(salePriceAed * 0.06))
}

function normalizeFrequency(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim().toLowerCase()
}

function classifyIntent(input: { intentRaw: unknown; pricingFrequencyRaw: unknown }) {
  const rawIntent = typeof input.intentRaw === 'string' ? input.intentRaw.trim().toUpperCase() : ''
  if (rawIntent === 'BUY' || rawIntent === 'SALE' || rawIntent === 'SELL') return 'BUY'
  if (rawIntent === 'RENT' || rawIntent === 'RENTAL' || rawIntent === 'LEASE' || rawIntent === 'LET') return 'RENT'

  const freq = normalizeFrequency(input.pricingFrequencyRaw)
  if (
    freq.includes('month') ||
    freq.includes('year') ||
    freq.includes('annual') ||
    freq.includes('annum') ||
    freq.includes('week') ||
    freq.includes('day')
  )
    return 'RENT'
  return 'BUY'
}

type Purpose = 'buy' | 'rent'

function safePurpose(v: unknown): Purpose {
  return v === 'rent' ? 'rent' : 'buy'
}

function deriveListingStatus(propertyId: string) {
  const bucket = hashToIndex(`status:${propertyId}`, 12)
  const sold = bucket === 0
  const offPlan = !sold && bucket <= 4
  const ready = !sold && !offPlan
  return { sold, offPlan, ready }
}

function deriveFeatures(propertyId: string) {
  const picked: MoreFeature[] = []
  for (let i = 0; i < MORE_FEATURES.length; i++) {
    const keep = hashToIndex(`feat:${propertyId}:${MORE_FEATURES[i]}`, 10) < 3
    if (keep) picked.push(MORE_FEATURES[i])
  }
  return picked
}

function buildPriceOptions(country: CountryCode) {
  const meta = COUNTRY_META[country]
  const opts: number[] = []
  const step = meta.priceStep * 5
  for (let v = meta.minPrice; v <= meta.maxPrice && opts.length < 10; v += step) {
    opts.push(v)
  }
  if (opts[opts.length - 1] !== meta.maxPrice) opts.push(meta.maxPrice)
  return opts
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
  const communityOptions = useMemo(() => {
    return COMMUNITIES_BY_CITY[draftFilters.location] || []
  }, [draftFilters.location])

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

  const displayedProperties = useMemo(() => {
    const countryForFilter = filters.country
    const minUi = parseInt(filters.minPrice)
    const maxUi = parseInt(filters.maxPrice)
    const minAed = Number.isFinite(minUi) ? uiPriceToAed(countryForFilter, minUi) : undefined
    const maxAed = Number.isFinite(maxUi) ? uiPriceToAed(countryForFilter, maxUi) : undefined

    let filtered = properties

    filtered = filtered.filter((p) => (purpose === 'rent' ? p.intent === 'RENT' : p.intent === 'BUY'))

    const effectivePrice = (p: Property) => {
      if (purpose !== 'rent') return p.price
      if (p.intent === 'RENT') return p.price
      return deriveAnnualRentAed(p.price)
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase()
      filtered = filtered.filter((p) => {
        const comm = deriveCommunity(p.location, p.id)
        return (
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          comm.toLowerCase().includes(q)
        )
      })
    }

    if (filters.location) {
      const q = filters.location.toLowerCase()
      filtered = filtered.filter((p) => p.location.toLowerCase().includes(q))
    }

    if (filters.community) {
      filtered = filtered.filter((p) => deriveCommunity(p.location, p.id) === filters.community)
    }

    if (filters.type) {
      const t = filters.type.toLowerCase()
      filtered = filtered.filter((p) => p.propertyType.toLowerCase() === t)
    }

    if (minAed != null) {
      filtered = filtered.filter((p) => effectivePrice(p) >= minAed)
    }
    if (maxAed != null) {
      filtered = filtered.filter((p) => effectivePrice(p) <= maxAed)
    }

    if (filters.bedrooms) {
      const b = parseInt(filters.bedrooms)
      if (Number.isFinite(b)) filtered = filtered.filter((p) => p.bedrooms >= b)
    }

    if (filters.bathrooms) {
      const b = parseInt(filters.bathrooms)
      if (Number.isFinite(b)) filtered = filtered.filter((p) => p.bathrooms >= b)
    }

    if (filters.offPlanOnly || filters.readyHomesOnly || filters.soldOnly) {
      filtered = filtered.filter((p) => {
        const st = deriveListingStatus(p.id)
        return (
          (filters.offPlanOnly && st.offPlan) ||
          (filters.readyHomesOnly && st.ready) ||
          (filters.soldOnly && st.sold)
        )
      })
    }

    if (filters.features.length > 0) {
      filtered = filtered.filter((p) => {
        const pf = deriveFeatures(p.id)
        return filters.features.every((f) => pf.includes(f as MoreFeature))
      })
    }

    const sortBy = filters.sortBy || 'featured'
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => {
          const ap = effectivePrice(a)
          const bp = effectivePrice(b)
          return ap - bp
        })
        break
      case 'price-high':
        filtered = [...filtered].sort((a, b) => {
          const ap = effectivePrice(a)
          const bp = effectivePrice(b)
          return bp - ap
        })
        break
      case 'newest':
        filtered = [...filtered].sort((a, b) => (b.yearBuilt || 0) - (a.yearBuilt || 0))
        break
      case 'featured':
      default:
        filtered = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
        break
    }

    if (purpose !== 'rent') return filtered

    return filtered.map((p) => ({ ...p, price: effectivePrice(p) }))
  }, [filters, properties, purpose])

  // Price options provided by `useProperties` hook

  const heroTitle = forcedPurpose === 'rent' ? 'Properties for Rent' : 'Properties for Sale'
  const heroSubtitle =
    forcedPurpose === 'rent'
      ? 'Discover premium rentals across curated markets. Refine by city, community, and price.'
      : 'Browse verified listings across curated markets. Refine by city, community, and price.'

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
          <p className="text-gray-600">{displayedProperties.length} properties found</p>
        </div>

        <div className="sticky top-14 md:top-20 z-30 mb-6 md:mb-10">
          <div className="space-y-3">
            <div className="relative z-20 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-full md:w-[320px]">
                  <SmartSearch draftFilters={draftFilters} setDraftFilters={setDraftFilters} onSearch={applyDraft} />
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

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-dark-blue mb-3">Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MORE_FEATURES.map((f) => {
                    const checked = draftFilters.features.includes(f)
                    return (
                      <label key={f} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setDraftFilters((prev) => {
                              const next = e.target.checked
                                ? [...prev.features, f]
                                : prev.features.filter((x) => x !== f)
                              return { ...prev, features: next }
                            })
                          }}
                        />
                        <span className="text-sm text-dark-blue">{f}</span>
                      </label>
                    )
                  })}
                </div>
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
      </div>
    </div>
  )
}
