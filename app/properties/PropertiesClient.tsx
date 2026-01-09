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

export default function PropertiesClient() {
  const searchParams = useSearchParams()
  const { country, setCountry } = useCountry()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const cityRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">Properties</h1>
          <p className="text-gray-600">{properties.length} properties found</p>
        </div>

        <div className="sticky top-20 z-30 mb-10">
          <div className="bg-white/85 backdrop-blur-md border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[repeat(15,minmax(0,1fr))] gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Country</label>
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
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                  >
                    <option value="UAE">UAE</option>
                    <option value="India">India</option>
                  </select>
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
                  <select
                    value={draftFilters.type}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
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
                  <select
                    value={draftFilters.bedrooms}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, bedrooms: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                  >
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Baths</label>
                  <select
                    value={draftFilters.bathrooms}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, bathrooms: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Sort By</label>
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) => {
                      const next = { ...draftFilters, sortBy: e.target.value }
                      setDraftFilters(next)
                      handleFilterChange({ sortBy: next.sortBy })
                    }}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price (Low to High)</option>
                    <option value="price-high">Price (High to Low)</option>
                    <option value="newest">Newest</option>
                  </select>
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
