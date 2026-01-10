'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PropertyListCard from '@/components/PropertyListCard'
import { useCountry } from '@/components/CountryProvider'
import { CITIES_BY_COUNTRY, COUNTRY_META, DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'

interface Property {
  id: string
  country: 'UAE' | 'India'
  title: string
  location: string
  price: number
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
  location: string
  type: string
  minPrice: string
  maxPrice: string
  bedrooms: string
  bathrooms: string
  sortBy: string
}

type SheetKey = 'country' | 'city' | 'type' | 'price' | 'beds' | 'baths' | 'sort' | null

export default function PropertiesClient() {
  const searchParams = useSearchParams()
  const { country, setCountry } = useCountry()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const cityRef = useRef<HTMLDivElement>(null)

  const [activeSheet, setActiveSheet] = useState<SheetKey>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [sheetDragStartY, setSheetDragStartY] = useState<number | null>(null)
  const [sheetDragY, setSheetDragY] = useState(0)

  const getParam = useCallback((key: string) => searchParams?.get(key) ?? '', [searchParams])

  const initialCountry = useMemo(() => {
    const fromUrl = getParam('country')
    if (fromUrl && isCountryCode(fromUrl)) return fromUrl
    return country || DEFAULT_COUNTRY
  }, [country, getParam])

  const [filters, setFilters] = useState<Filters>({
    country: initialCountry,
    location: getParam('location'),
    type: getParam('type'),
    minPrice: getParam('minPrice') || COUNTRY_META[initialCountry].minPrice.toString(),
    maxPrice: getParam('maxPrice') || COUNTRY_META[initialCountry].maxPrice.toString(),
    bedrooms: getParam('bedrooms'),
    bathrooms: getParam('bathrooms'),
    sortBy: 'featured',
  })

  const [draftFilters, setDraftFilters] = useState<Filters>(filters)

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
        location: '',
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
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value.toString())
      })
      const res = await fetch(`/api/properties?${params.toString()}`)
      const data = await res.json()
      setProperties(data)
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

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
        location: '',
        minPrice: COUNTRY_META[nextCountry].minPrice.toString(),
        maxPrice: COUNTRY_META[nextCountry].maxPrice.toString(),
      })
      return
    }

    setFilters({ ...filters, ...newFilters })
  }

  const cities = useMemo(() => CITIES_BY_COUNTRY[draftFilters.country], [draftFilters.country])

  const applyDraft = () => {
    handleFilterChange(draftFilters)
  }

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.toLowerCase().includes(q))
  }, [cities, cityQuery])

  const openSheet = (key: SheetKey) => {
    setActiveSheet(key)
    setSheetVisible(false)
    setSheetDragStartY(null)
    setSheetDragY(0)
    if (key === 'city') setCityQuery('')
    if (key === 'city') setCityOpen(false)
    requestAnimationFrame(() => setSheetVisible(true))
  }

  const closeSheet = () => {
    setSheetVisible(false)
    setSheetDragStartY(null)
    setSheetDragY(0)
    window.setTimeout(() => setActiveSheet(null), 220)
  }

  const sheetTitle = useMemo(() => {
    switch (activeSheet) {
      case 'country':
        return 'Country'
      case 'city':
        return 'City'
      case 'type':
        return 'Property Type'
      case 'price':
        return 'Price Range'
      case 'beds':
        return 'Beds'
      case 'baths':
        return 'Baths'
      case 'sort':
        return 'Sort By'
      default:
        return ''
    }
  }, [activeSheet])

  const priceChip = useMemo(() => {
    const cur = COUNTRY_META[draftFilters.country].currencyLabel
    const min = draftFilters.minPrice || ''
    const max = draftFilters.maxPrice || ''
    if (!min && !max) return `Price`
    if (min && max) return `${cur} ${min} - ${max}`
    if (min) return `${cur} ${min}+`
    return `${cur} Up to ${max}`
  }, [draftFilters.country, draftFilters.maxPrice, draftFilters.minPrice])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">Properties</h1>
          <p className="text-gray-600">{properties.length} properties found</p>
        </div>

        <div className="sticky top-14 md:top-20 z-30 mb-6 md:mb-10">
          <div className="md:hidden bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm">
            <div className="px-3 py-3">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => openSheet('country')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.country}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('city')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.location || 'City'}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('type')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.type || 'Type'}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('price')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {priceChip}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('beds')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.bedrooms ? `${draftFilters.bedrooms}+ Beds` : 'Beds'}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('baths')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.bathrooms ? `${draftFilters.bathrooms}+ Baths` : 'Baths'}
                </button>
                <button
                  type="button"
                  onClick={() => openSheet('sort')}
                  className="shrink-0 h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
                >
                  {draftFilters.sortBy === 'featured'
                    ? 'Featured'
                    : draftFilters.sortBy === 'price-low'
                      ? 'Price ↑'
                      : draftFilters.sortBy === 'price-high'
                        ? 'Price ↓'
                        : 'Newest'}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:block bg-white/85 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[repeat(15,minmax(0,1fr))] gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Country</label>
                  <div className="relative">
                    <select
                      value={draftFilters.country}
                      onChange={(e) => {
                        const nextCountry = e.target.value as CountryCode
                        const meta = COUNTRY_META[nextCountry]
                        const next = {
                          ...draftFilters,
                          country: nextCountry,
                          location: '',
                          minPrice: meta.minPrice.toString(),
                          maxPrice: meta.maxPrice.toString(),
                        }
                        setDraftFilters(next)
                        handleFilterChange(next)
                      }}
                      className="mf-select w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                    >
                      <option value="UAE">UAE</option>
                      <option value="India">India</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">City</label>
                  <div className="relative" ref={cityRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setCityOpen((v) => !v)
                        setCityQuery('')
                      }}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-left focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                    >
                      <span className={draftFilters.location ? 'text-gray-900' : 'text-gray-500'}>
                        {draftFilters.location || 'Select City'}
                      </span>
                    </button>

                    {cityOpen && (
                      <div className="absolute z-40 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            value={cityQuery}
                            onChange={(e) => setCityQuery(e.target.value)}
                            placeholder="Search city..."
                            className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                          />
                        </div>

                        <div className="max-h-56 overflow-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftFilters((prev) => ({ ...prev, location: '' }))
                              setCityOpen(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50"
                          >
                            All Cities
                          </button>
                          {filteredCities.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setDraftFilters((prev) => ({ ...prev, location: c }))
                                setCityOpen(false)
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50"
                            >
                              {c}
                            </button>
                          ))}
                          {filteredCities.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">No cities found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Property Type</label>
                  <div className="relative">
                    <select
                      value={draftFilters.type}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
                      className="mf-select w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                    >
                      <option value="">All Types</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                      <option value="Penthouse">Penthouse</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Plot">Plot</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Mansion">Mansion</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Min Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      {COUNTRY_META[draftFilters.country].currencyLabel}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draftFilters.minPrice}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full h-11 pl-12 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Max Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      {COUNTRY_META[draftFilters.country].currencyLabel}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={draftFilters.maxPrice}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full h-11 pl-12 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Beds</label>
                  <div className="relative">
                    <select
                      value={draftFilters.bedrooms}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
                      className="mf-select w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                    >
                      <option value="">Any</option>
                      <option value="0">Studio</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5+</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Baths</label>
                  <div className="relative">
                    <select
                      value={draftFilters.bathrooms}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, bathrooms: e.target.value }))}
                      className="mf-select w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                    >
                      <option value="">Any</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4+</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Sort By</label>
                  <div className="relative">
                    <select
                      value={draftFilters.sortBy}
                      onChange={(e) => {
                        const next = { ...draftFilters, sortBy: e.target.value }
                        setDraftFilters(next)
                        handleFilterChange({ sortBy: next.sortBy })
                      }}
                      className="mf-select w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-[#2b4d72] focus:outline-none"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-low">Price (Low to High)</option>
                      <option value="price-high">Price (High to Low)</option>
                      <option value="newest">Newest</option>
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="md:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={applyDraft}
                    className="h-11 w-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors inline-flex items-center justify-center"
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
        </div>

        {activeSheet && (
          <div className="fixed inset-0 z-[70] md:hidden">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
              onClick={closeSheet}
            />

            <div
              className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl border border-gray-200 shadow-2xl"
              style={{
                transform: sheetVisible ? `translateY(${sheetDragY}px)` : 'translateY(16px)',
                transition: sheetDragStartY ? 'none' : 'transform 220ms ease',
              }}
              onTouchStart={(e) => {
                setSheetDragStartY(e.touches[0]?.clientY ?? null)
              }}
              onTouchMove={(e) => {
                if (sheetDragStartY == null) return
                const y = e.touches[0]?.clientY ?? sheetDragStartY
                const delta = Math.max(0, y - sheetDragStartY)
                setSheetDragY(delta)
              }}
              onTouchEnd={() => {
                if (sheetDragY > 90) {
                  closeSheet()
                  return
                }
                setSheetDragStartY(null)
                setSheetDragY(0)
              }}
            >
              <div className="px-4 pt-4 pb-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-1.5 rounded-full bg-gray-200" />
                    <span className="text-base font-semibold text-dark-blue">{sheetTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-auto p-4">
                {activeSheet === 'country' && (
                  <div className="space-y-2">
                    {(['UAE', 'India'] as CountryCode[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const meta = COUNTRY_META[c]
                          const next: Filters = {
                            ...draftFilters,
                            country: c,
                            location: '',
                            minPrice: meta.minPrice.toString(),
                            maxPrice: meta.maxPrice.toString(),
                          }
                          setDraftFilters(next)
                          handleFilterChange(next)
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          draftFilters.country === c
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {activeSheet === 'city' && (
                  <div>
                    <div className="mb-3">
                      <input
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        placeholder="Search city..."
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...draftFilters, location: '' }
                          setDraftFilters(next)
                          handleFilterChange({ location: '' })
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          !draftFilters.location
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        All Cities
                      </button>
                      {filteredCities.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            const next = { ...draftFilters, location: c }
                            setDraftFilters(next)
                            handleFilterChange({ location: c })
                            closeSheet()
                          }}
                          className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                            draftFilters.location === c
                              ? 'border-dark-blue bg-dark-blue text-white'
                              : 'border-gray-200 bg-white text-dark-blue'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSheet === 'type' && (
                  <div className="space-y-2">
                    {['', 'Apartment', 'Villa', 'Penthouse', 'Townhouse', 'Plot', 'Commercial', 'Mansion'].map((t) => (
                      <button
                        key={t || 'all'}
                        type="button"
                        onClick={() => {
                          const next = { ...draftFilters, type: t }
                          setDraftFilters(next)
                          handleFilterChange({ type: t })
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          draftFilters.type === t
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        {t || 'All Types'}
                      </button>
                    ))}
                  </div>
                )}

                {activeSheet === 'beds' && (
                  <div className="space-y-2">
                    {['', '0', '1', '2', '3', '4', '5'].map((b) => (
                      <button
                        key={b || 'any'}
                        type="button"
                        onClick={() => {
                          const next = { ...draftFilters, bedrooms: b }
                          setDraftFilters(next)
                          handleFilterChange({ bedrooms: b })
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          draftFilters.bedrooms === b
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        {b === '' ? 'Any' : b === '0' ? 'Studio' : b === '5' ? '5+' : `${b}+`}
                      </button>
                    ))}
                  </div>
                )}

                {activeSheet === 'baths' && (
                  <div className="space-y-2">
                    {['', '1', '2', '3', '4'].map((b) => (
                      <button
                        key={b || 'any'}
                        type="button"
                        onClick={() => {
                          const next = { ...draftFilters, bathrooms: b }
                          setDraftFilters(next)
                          handleFilterChange({ bathrooms: b })
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          draftFilters.bathrooms === b
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        {b === '' ? 'Any' : b === '4' ? '4+' : `${b}+`}
                      </button>
                    ))}
                  </div>
                )}

                {activeSheet === 'sort' && (
                  <div className="space-y-2">
                    {(
                      [
                        { key: 'featured', label: 'Featured' },
                        { key: 'price-low', label: 'Price (Low to High)' },
                        { key: 'price-high', label: 'Price (High to Low)' },
                        { key: 'newest', label: 'Newest' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          const next = { ...draftFilters, sortBy: opt.key }
                          setDraftFilters(next)
                          handleFilterChange({ sortBy: opt.key })
                          closeSheet()
                        }}
                        className={`w-full h-12 rounded-xl border px-4 text-left font-semibold ${
                          draftFilters.sortBy === opt.key
                            ? 'border-dark-blue bg-dark-blue text-white'
                            : 'border-gray-200 bg-white text-dark-blue'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeSheet === 'price' && (
                  <div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          {COUNTRY_META[draftFilters.country].currencyLabel}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={draftFilters.minPrice}
                          onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                          placeholder="Min Price"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                          {COUNTRY_META[draftFilters.country].currencyLabel}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={draftFilters.maxPrice}
                          onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                          className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                          placeholder="Max Price"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleFilterChange({ minPrice: draftFilters.minPrice, maxPrice: draftFilters.maxPrice })
                        closeSheet()
                      }}
                      className="mt-4 w-full h-12 rounded-xl bg-dark-blue text-white font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => (
              <PropertyListCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
