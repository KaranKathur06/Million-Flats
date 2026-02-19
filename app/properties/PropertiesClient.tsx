'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PropertyListCard from '@/components/PropertyListCard'
import { useCountry } from '@/components/CountryProvider'
import { CITIES_BY_COUNTRY, COUNTRY_META, DEFAULT_COUNTRY, isCountryCode, uiPriceToAed, type CountryCode } from '@/lib/country'

interface Property {
  id: string
  country: 'UAE' | 'India'
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
  const searchParams = useSearchParams()
  const { country, setCountry } = useCountry()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string>('')
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const cityRefMobile = useRef<HTMLDivElement>(null)
  const cityRefDesktop = useRef<HTMLDivElement>(null)

  const [communityOpen, setCommunityOpen] = useState(false)
  const [communityQuery, setCommunityQuery] = useState('')
  const communityRefMobile = useRef<HTMLDivElement>(null)
  const communityRefDesktop = useRef<HTMLDivElement>(null)

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [moreFiltersVisible, setMoreFiltersVisible] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false)

  const [purposeState, setPurposeState] = useState<Purpose>(() => {
    if (forcedPurpose) return forcedPurpose
    const fromUrl = searchParams?.get('purpose')
    return safePurpose(fromUrl)
  })

  const purpose = forcedPurpose ?? purposeState

  const setPurpose = (next: Purpose) => {
    if (forcedPurpose) return
    setPurposeState(next)
  }

  const getParam = useCallback((key: string) => searchParams?.get(key) ?? '', [searchParams])

  const initialCountry = useMemo(() => {
    const fromUrl = getParam('country')
    if (fromUrl && isCountryCode(fromUrl)) return fromUrl
    return country || DEFAULT_COUNTRY
  }, [country, getParam])

  const [filters, setFilters] = useState<Filters>({
    country: initialCountry,
    search: getParam('q'),
    location: getParam('location'),
    community: getParam('community'),
    type: getParam('type'),
    minPrice: getParam('minPrice') || COUNTRY_META[initialCountry].minPrice.toString(),
    maxPrice: getParam('maxPrice') || COUNTRY_META[initialCountry].maxPrice.toString(),
    bedrooms: getParam('bedrooms'),
    bathrooms: getParam('bathrooms'),
    sortBy: 'featured',
    offPlanOnly: false,
    readyHomesOnly: false,
    soldOnly: false,
    features: [],
  })

  const [draftFilters, setDraftFilters] = useState<Filters>(filters)

  const syncUrl = useCallback((nextFilters: Filters, nextPurpose: 'buy' | 'rent') => {
    const params = new URLSearchParams(window.location.search)
    params.set('purpose', nextPurpose)

    params.set('country', nextFilters.country)
    if (nextFilters.search) params.set('q', nextFilters.search)
    else params.delete('q')
    if (nextFilters.location) params.set('location', nextFilters.location)
    else params.delete('location')
    if (nextFilters.community) params.set('community', nextFilters.community)
    else params.delete('community')
    if (nextFilters.type) params.set('type', nextFilters.type)
    else params.delete('type')

    if (nextFilters.minPrice) params.set('minPrice', nextFilters.minPrice)
    else params.delete('minPrice')
    if (nextFilters.maxPrice) params.set('maxPrice', nextFilters.maxPrice)
    else params.delete('maxPrice')
    if (nextFilters.bedrooms) params.set('bedrooms', nextFilters.bedrooms)
    else params.delete('bedrooms')
    if (nextFilters.bathrooms) params.set('bathrooms', nextFilters.bathrooms)
    else params.delete('bathrooms')
    if (nextFilters.sortBy) params.set('sortBy', nextFilters.sortBy)
    else params.delete('sortBy')

    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [])

  useEffect(() => {
    syncUrl(filters, purpose)
  }, [filters, purpose, syncUrl])

  useEffect(() => {
    if (!forcedPurpose) return
    setPurposeState(forcedPurpose)
  }, [forcedPurpose])

  useEffect(() => {
    const fromUrl = getParam('country')
    if (fromUrl && isCountryCode(fromUrl) && fromUrl !== country) {
      setCountry(fromUrl)
    }
  }, [country, getParam, setCountry])

  useEffect(() => {
    if (filters.country !== country) {
      setFilters((prev) => ({
        ...prev,
        country,
        search: '',
        location: '',
        community: '',
        minPrice: COUNTRY_META[country].minPrice.toString(),
        maxPrice: COUNTRY_META[country].maxPrice.toString(),
      }))
    }
  }, [country, filters.country])

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

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

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = new URLSearchParams()

      params.set('country', filters.country)
      if (filters.location) params.set('city', filters.location)
      if (filters.community) params.set('community', filters.community)
      if (filters.type) params.set('type', filters.type)
      if (filters.minPrice) params.set('minPrice', filters.minPrice)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms)
      if (filters.bathrooms) params.set('bathrooms', filters.bathrooms)
      params.set('purpose', purpose)

      const res = await fetch(`/api/properties?${params.toString()}`)
      const text = await res.text().catch(() => '')
      const json = text ? (JSON.parse(text) as any) : null

      if (!res.ok || !json?.success) {
        setProperties([])
        setApiError('Unable to load properties. Please try again later.')
        return
      }

      const items = Array.isArray(json?.items) ? (json.items as any[]) : []

      const mapped = items
        .map((item: any) => {
          const id = String(item?.id || '').trim()
          if (!id) return null

          const title = typeof item?.title === 'string' ? item.title : 'Property'
          const countryLabel: 'UAE' | 'India' = item?.country === 'India' ? 'India' : 'UAE'
          const city = typeof item?.city === 'string' ? item.city : ''
          const community = typeof item?.community === 'string' ? item.community : ''
          const location = community ? `${city} · ${community}` : city

          const intentRaw = String(item?.intent || '').toUpperCase()
          const intent: 'BUY' | 'RENT' = intentRaw === 'RENT' ? 'RENT' : 'BUY'

          const images: string[] = Array.isArray(item?.images) ? item.images.map((v: any) => String(v || '')).filter(Boolean) : []

          const agentRaw = item?.agent
          const agent = agentRaw
            ? {
                id: String(agentRaw?.id || ''),
                name: String(agentRaw?.name || ''),
                email: String(agentRaw?.email || ''),
                phone: String(agentRaw?.phone || ''),
                avatar: typeof agentRaw?.avatar === 'string' ? agentRaw.avatar : undefined,
              }
            : undefined

          return {
            id,
            country: countryLabel,
            title,
            location,
            price: Number(item?.price || 0),
            intent,
            bedrooms: Number(item?.bedrooms || 0),
            bathrooms: Number(item?.bathrooms || 0),
            squareFeet: Number(item?.squareFeet || 0),
            images,
            featured: Boolean(item?.featured),
            propertyType: String(item?.propertyType || 'Property'),
            agent,
          } satisfies Property
        })
        .filter(Boolean) as Property[]

      setProperties(mapped)
      if (mapped.length === 0) setApiError('No properties found matching your filters')
    } catch (e) {
      setProperties([])
      setApiError('Unable to load properties. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [filters.bathrooms, filters.bedrooms, filters.community, filters.country, filters.location, filters.maxPrice, filters.minPrice, filters.type, purpose])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    if (newFilters.country && newFilters.country !== country && isCountryCode(newFilters.country)) {
      const nextCountry = newFilters.country
      setCountry(nextCountry)
      setFilters({
        ...filters,
        ...newFilters,
        search: '',
        location: '',
        community: '',
        minPrice: COUNTRY_META[nextCountry].minPrice.toString(),
        maxPrice: COUNTRY_META[nextCountry].maxPrice.toString(),
      })
      return
    }

    const nextLocation = newFilters.location
    const didLocationChange = nextLocation !== undefined && nextLocation !== filters.location
    const next: Filters = {
      ...filters,
      ...newFilters,
      community: didLocationChange ? '' : filters.community,
      search: didLocationChange ? '' : filters.search,
    }
    setFilters(next)
  }

  const cities = useMemo(() => CITIES_BY_COUNTRY[draftFilters.country], [draftFilters.country])

  const communityOptions = useMemo(() => {
    return COMMUNITIES_BY_CITY[draftFilters.location] || []
  }, [draftFilters.location])

  const applyDraft = () => {
    handleFilterChange(draftFilters)
  }

  const resetFilters = () => {
    const nextCountry = country || DEFAULT_COUNTRY
    const next: Filters = {
      country: nextCountry,
      search: '',
      location: '',
      community: '',
      type: '',
      minPrice: COUNTRY_META[nextCountry].minPrice.toString(),
      maxPrice: COUNTRY_META[nextCountry].maxPrice.toString(),
      bedrooms: '',
      bathrooms: '',
      sortBy: 'featured',
      offPlanOnly: false,
      readyHomesOnly: false,
      soldOnly: false,
      features: [],
    }

    setPurpose('buy')
    if (nextCountry !== country) setCountry(nextCountry)
    setFilters(next)
    setDraftFilters(next)

    setCityQuery('')
    setCommunityQuery('')
    setCityOpen(false)
    setCommunityOpen(false)

    setMoreFiltersVisible(false)
    setMoreFiltersOpen(false)
    setMobileFiltersVisible(false)
    setMobileFiltersOpen(false)
  }

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.toLowerCase().includes(q))
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

  const priceOptions = useMemo(() => buildPriceOptions(draftFilters.country), [draftFilters.country])

  const heroTitle = forcedPurpose === 'rent' ? 'Properties for Rent' : 'Properties for Sale'
  const heroSubtitle =
    forcedPurpose === 'rent'
      ? 'Discover premium rentals across curated markets. Refine by city, community, and price.'
      : 'Browse verified listings across curated markets. Refine by city, community, and price.'

  return (
    <div className="min-h-screen bg-gray-50">
      {!forcedPurpose ? (
        <section className="relative w-full aspect-[16/6] max-h-[500px] bg-gray-100 overflow-hidden">
          <Image
            src="/HOMEPAGE.jpg"
            alt={heroTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1920px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

          <div className="absolute inset-0">
            <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 h-full flex flex-col items-center justify-center text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                {heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <p className="text-gray-600">{displayedProperties.length} properties found</p>
        </div>

        <div className="sticky top-14 md:top-20 z-30 mb-6 md:mb-10">
          <div className="space-y-3">
            <div className="relative z-20 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm p-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative group w-full md:w-[150px]">
                  <select
                    value={draftFilters.country}
                    onChange={(e) => {
                      const next = e.target.value
                      if (!isCountryCode(next)) return
                      setDraftFilters((prev) => ({
                        ...prev,
                        country: next,
                        location: '',
                        community: '',
                      }))
                      setCityQuery('')
                      setCommunityQuery('')
                      setCityOpen(false)
                      setCommunityOpen(false)
                    }}
                    className="mf-select w-full h-12 md:h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="UAE">UAE</option>
                    <option value="India">India</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
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

                <div className="relative group">
                  <select
                    value={draftFilters.type}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
                    className="mf-select h-11 min-w-[170px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="">Property Type</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Plot">Plot</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative group">
                  <select
                    value={draftFilters.minPrice}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                    className="mf-select h-11 min-w-[150px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="">Min Price</option>
                    {priceOptions.map((p) => (
                      <option key={p} value={p.toString()}>
                        {COUNTRY_META[draftFilters.country].currencyLabel} {p.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative group">
                  <select
                    value={draftFilters.maxPrice}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                    className="mf-select h-11 min-w-[150px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="">Max Price</option>
                    {priceOptions.map((p) => (
                      <option key={p} value={p.toString()}>
                        {COUNTRY_META[draftFilters.country].currencyLabel} {p.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative group">
                  <select
                    value={draftFilters.bedrooms}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
                    className="mf-select h-11 min-w-[120px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="">Beds</option>
                    <option value="0">Studio</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative group">
                  <select
                    value={draftFilters.bathrooms}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, bathrooms: e.target.value }))}
                    className="mf-select h-11 min-w-[120px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="">Baths</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

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

                <div className="relative group">
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                    className="mf-select h-11 min-w-[160px] px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price (Low)</option>
                    <option value="price-high">Price (High)</option>
                    <option value="newest">Newest</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

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

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-[90] md:hidden">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
                mobileFiltersVisible ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={closeMobileFilters}
            />
            <div
              className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl border border-gray-200 transition-transform duration-200 ${
                mobileFiltersVisible ? 'translate-y-0' : 'translate-y-6'
              }`}
            >
            <div className="px-4 pt-4 pb-24 space-y-4 overflow-auto max-h-[75vh]">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-dark-blue">Property Filters</h2>
                <button
                  type="button"
                  onClick={closeMobileFilters}
                  className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {!forcedPurpose ? (
                <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 w-fit">
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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Property Type</label>
                <div className="relative group">
                  <select
                    value={draftFilters.type}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
                    className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Plot">Plot</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Min Price</label>
                  <div className="relative group">
                    <select
                      value={draftFilters.minPrice}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                      className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">Min</option>
                      {priceOptions.map((p) => (
                        <option key={p} value={p.toString()}>
                          {COUNTRY_META[draftFilters.country].currencyLabel} {p.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Max Price</label>
                  <div className="relative group">
                    <select
                      value={draftFilters.maxPrice}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                      className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">Max</option>
                      {priceOptions.map((p) => (
                        <option key={p} value={p.toString()}>
                          {COUNTRY_META[draftFilters.country].currencyLabel} {p.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Beds</label>
                  <div className="relative group">
                    <select
                      value={draftFilters.bedrooms}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
                      className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">Any</option>
                      <option value="0">Studio</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                      <option value="5">5+</option>
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Baths</label>
                  <div className="relative group">
                    <select
                      value={draftFilters.bathrooms}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, bathrooms: e.target.value }))}
                      className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                    >
                      <option value="">Any</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Sort By</label>
                <div className="relative group">
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                    className="mf-select w-full h-12 px-4 pr-11 rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price (Low)</option>
                    <option value="price-high">Price (High)</option>
                    <option value="newest">Newest</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform duration-200 group-focus-within:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  closeMobileFilters()
                  openMoreFilters()
                }}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
              >
                More Filters
              </button>
            </div>

            <div className="fixed left-0 right-0 bottom-0 p-4 bg-white border-t border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileFilters()
                    applyDraft()
                  }}
                  className="h-12 w-full rounded-xl bg-dark-blue text-white text-sm font-semibold"
                >
                  Apply Filters
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {apiError ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{apiError}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : displayedProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedProperties.map((property) => (
              <PropertyListCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
