 'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCountry } from '@/components/CountryProvider'
import { CITIES_BY_COUNTRY, COUNTRY_META, type CountryCode } from '@/lib/country'

export default function HeroSearch() {
  const router = useRouter()
  const { country, setCountry } = useCountry()
  const [city, setCity] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const cities = useMemo(() => CITIES_BY_COUNTRY[country], [country])
  const countryMeta = COUNTRY_META[country]

  useEffect(() => {
    setCity('')
  }, [country])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('country', country)
    if (city) params.set('location', city)
    if (propertyType) params.set('type', propertyType)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    router.push(`/properties?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="bg-dark-blue/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-7 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 items-stretch">
        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-white/80 mb-2">Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            className="w-full h-14 px-4 rounded-xl bg-white/10 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
          >
            <option value="UAE" className="text-gray-900">UAE</option>
            <option value="India" className="text-gray-900">India</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-white/80 mb-2">City</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-14 px-4 rounded-xl bg-white/10 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
          >
            <option value="" className="text-gray-900">Select City</option>
            {cities.map((c) => (
              <option key={c} value={c} className="text-gray-900">{c}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-white/80 mb-2">Property Type</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full h-14 px-4 rounded-xl bg-white/10 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
          >
            <option value="" className="text-gray-900">All Types</option>
            <option value="Apartment" className="text-gray-900">Apartment</option>
            <option value="Villa" className="text-gray-900">Villa</option>
            <option value="Penthouse" className="text-gray-900">Penthouse</option>
            <option value="Townhouse" className="text-gray-900">Townhouse</option>
            <option value="Plot" className="text-gray-900">Plot</option>
            <option value="Commercial" className="text-gray-900">Commercial</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-white/80 mb-2">Min Price</label>
          <input
            type="number"
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={country === 'UAE' ? '500000' : '5000000'}
            className="w-full h-14 px-4 rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-white/80 mb-2">Max Price</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 text-sm">
              {countryMeta.currencyLabel}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={country === 'UAE' ? '5000000' : '50000000'}
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
            />
          </div>
        </div>

        <div className="md:col-span-1 flex items-end">
          <button
            type="submit"
            className="w-full h-14 bg-accent-yellow text-dark-blue rounded-xl font-semibold hover:bg-accent-yellow/90 transition-colors"
          >
            Browse Properties
          </button>
        </div>
      </div>
    </form>
  )
}
