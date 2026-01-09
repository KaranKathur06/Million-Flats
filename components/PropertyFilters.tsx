'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { CITIES_BY_COUNTRY, COUNTRY_META, type CountryCode } from '@/lib/country'

interface Filters {
  country: CountryCode
  location: string
  type: string
  minPrice: string
  maxPrice: string
  bedrooms: string
  bathrooms: string
  sortBy: string
}

interface PropertyFiltersProps {
  filters: Filters
  onFilterChange: (filters: Partial<Filters>) => void
}

// Format AED currency
const formatAED = (country: CountryCode, amount: number) => {
  const meta = COUNTRY_META[country]
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function PropertyFilters({ filters, onFilterChange }: PropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const locationRef = useRef<HTMLDivElement>(null)

  const meta = useMemo(() => COUNTRY_META[filters.country], [filters.country])
  const cities = useMemo(() => CITIES_BY_COUNTRY[filters.country], [filters.country])

  const MIN_PRICE = meta.minPrice
  const MAX_PRICE = meta.maxPrice

  const SHOW_MANUAL_PRICE_INPUTS = false

  const handleReset = () => {
    onFilterChange({
      country: filters.country,
      location: '',
      type: '',
      minPrice: MIN_PRICE.toString(),
      maxPrice: MAX_PRICE.toString(),
      bedrooms: '',
      bathrooms: '',
      sortBy: 'featured',
    })
    setLocationSearch('')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCities = cities.filter(city => city.toLowerCase().includes(locationSearch.toLowerCase()))

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || (type === 'min' ? MIN_PRICE : MAX_PRICE)
    if (type === 'min') {
      onFilterChange({ minPrice: Math.min(numValue, parseInt(filters.maxPrice || MAX_PRICE.toString())).toString() })
    } else {
      onFilterChange({ maxPrice: Math.max(numValue, parseInt(filters.minPrice || MIN_PRICE.toString())).toString() })
    }
  }

  const quickPricePresets = [
    { label: 'Under 1M', min: MIN_PRICE, max: 1000000 },
    { label: '1M – 3M', min: 1000000, max: 3000000 },
    { label: '3M – 10M', min: 3000000, max: 10000000 },
    { label: '10M+', min: 10000000, max: MAX_PRICE },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-dark-blue">Filters</h2>
        <button
          onClick={handleReset}
          className="text-sm font-medium text-accent-orange hover:text-accent-orange/80 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select
            value={filters.country}
            onChange={(e) => onFilterChange({ country: e.target.value as CountryCode })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue bg-white hover:border-gray-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="UAE">UAE</option>
            <option value="India">India</option>
          </select>
        </div>

        {/* Location - Searchable Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <div className="relative" ref={locationRef}>
            <div
              onClick={() => setIsOpen(!isOpen)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-dark-blue focus-within:border-dark-blue cursor-pointer bg-white flex items-center justify-between hover:border-gray-400 transition-colors"
            >
              <span className={filters.location ? 'text-gray-900' : 'text-gray-500'}>
                {filters.location || 'All Locations'}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
                <div className="p-2 sticky top-0 bg-white border-b">
                  <input
                    type="text"
                    placeholder="Search location..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
                  />
                </div>
                <div
                  onClick={() => {
                    onFilterChange({ location: '' })
                    setIsOpen(false)
                    setLocationSearch('')
                  }}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b"
                >
                  <span className="text-gray-900">All Locations</span>
                </div>
                {filteredCities.map((city) => (
                  <div
                    key={city}
                    onClick={() => {
                      onFilterChange({ location: city })
                      setIsOpen(false)
                      setLocationSearch('')
                    }}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                      filters.location === city ? 'bg-dark-blue/5' : ''
                    }`}
                  >
                    <span className={filters.location === city ? 'text-dark-blue font-medium' : 'text-gray-900'}>
                      {city}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue bg-white hover:border-gray-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Penthouse">Penthouse</option>
            <option value="Townhouse">Townhouse</option>
          </select>
        </div>

        {/* Price Range - Dual Handle Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Price Range</label>
          
          {/* Price Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-dark-blue">
                {formatAED(filters.country, parseInt(filters.minPrice || MIN_PRICE.toString()))}
              </span>
              <span className="text-gray-400 mx-2">—</span>
              <span className="font-medium text-dark-blue">
                {formatAED(filters.country, parseInt(filters.maxPrice || MAX_PRICE.toString()))}
              </span>
            </div>
          </div>

          {/* Dual Range Slider */}
          <div className="relative h-2 bg-gray-200 rounded-full mb-4">
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={meta.priceStep}
              value={filters.minPrice || MIN_PRICE}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
              style={{
                background: 'transparent',
              }}
            />
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={meta.priceStep}
              value={filters.maxPrice || MAX_PRICE}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
            />
            <div
              className="absolute h-2 bg-dark-blue rounded-full"
              style={{
                left: `${((parseInt(filters.minPrice || MIN_PRICE.toString()) - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
                width: `${((parseInt(filters.maxPrice || MAX_PRICE.toString()) - parseInt(filters.minPrice || MIN_PRICE.toString())) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
              }}
            />
          </div>

          {/* Quick Price Presets */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickPricePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onFilterChange({
                    minPrice: preset.min.toString(),
                    maxPrice: preset.max.toString(),
                  })
                }}
                className="px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:border-dark-blue hover:bg-dark-blue/5 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Manual Input Fields */}
          {SHOW_MANUAL_PRICE_INPUTS && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min (AED)</label>
                <input
                  type="number"
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={meta.priceStep}
                  value={parseInt(filters.minPrice || MIN_PRICE.toString())}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max (AED)</label>
                <input
                  type="number"
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={meta.priceStep}
                  value={parseInt(filters.maxPrice || MAX_PRICE.toString())}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
          <select
            value={filters.bedrooms}
            onChange={(e) => onFilterChange({ bedrooms: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue bg-white hover:border-gray-400 transition-colors appearance-none cursor-pointer"
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

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
          <select
            value={filters.bathrooms}
            onChange={(e) => onFilterChange({ bathrooms: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue bg-white hover:border-gray-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Any</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dark-blue focus:border-dark-blue bg-white hover:border-gray-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>
    </div>
  )
}
