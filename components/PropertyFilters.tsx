'use client'

import { useEffect, useMemo } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'
import {
  BATHROOM_FILTER_OPTIONS,
  BEDROOM_FILTER_OPTIONS,
  COUNTRY_FILTER_OPTIONS,
  cityFilterOptions,
  LISTING_SORT_OPTIONS,
  PROPERTY_TYPE_FILTER_OPTIONS,
} from '@/lib/filters/dropdownOptions'
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
  const meta = useMemo(() => COUNTRY_META[filters.country], [filters.country])

  const MIN_PRICE = meta.minPrice
  const MAX_PRICE = meta.maxPrice
  const SHOW_MANUAL_PRICE_INPUTS = false

  const locationOptions = useMemo(
    () => cityFilterOptions(CITIES_BY_COUNTRY[filters.country], 'All Locations'),
    [filters.country]
  )

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
  }

  useEffect(() => {
    if (filters.location) {
      onFilterChange({ location: '' })
    }
  }, [filters.country, filters.location, onFilterChange])

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
        <GlobalDropdown
          label="Country"
          value={filters.country}
          onChange={(v) => onFilterChange({ country: singleDropdownValue(v) as CountryCode })}
          options={COUNTRY_FILTER_OPTIONS}
          appearance="admin-light"
        />

        <GlobalDropdown
          label="Location"
          value={filters.location}
          onChange={(v) => onFilterChange({ location: singleDropdownValue(v) })}
          options={locationOptions}
          searchable
          appearance="admin-light"
        />

        <GlobalDropdown
          label="Property Type"
          value={filters.type}
          onChange={(v) => onFilterChange({ type: singleDropdownValue(v) })}
          options={PROPERTY_TYPE_FILTER_OPTIONS}
          appearance="admin-light"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Price Range</label>
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

          <div className="relative h-2 bg-gray-200 rounded-full mb-4">
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={meta.priceStep}
              value={filters.minPrice || MIN_PRICE}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
              style={{ background: 'transparent' }}
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

        <GlobalDropdown
          label="Bedrooms"
          value={filters.bedrooms}
          onChange={(v) => onFilterChange({ bedrooms: singleDropdownValue(v) })}
          options={BEDROOM_FILTER_OPTIONS}
          appearance="admin-light"
        />

        <GlobalDropdown
          label="Bathrooms"
          value={filters.bathrooms}
          onChange={(v) => onFilterChange({ bathrooms: singleDropdownValue(v) })}
          options={BATHROOM_FILTER_OPTIONS}
          appearance="admin-light"
        />

        <GlobalDropdown
          label="Sort By"
          value={filters.sortBy}
          onChange={(v) => onFilterChange({ sortBy: singleDropdownValue(v) })}
          options={LISTING_SORT_OPTIONS}
          appearance="admin-light"
        />
      </div>
    </div>
  )
}
