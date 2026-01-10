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
    <form
      onSubmit={handleSearch}
      className="w-[94%] mx-auto md:w-full bg-black/30 md:bg-dark-blue/80 backdrop-blur-lg md:backdrop-blur-md border border-white/15 md:border-white/10 rounded-2xl p-4 md:p-7 shadow-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-stretch">
        <div className="md:col-span-1">
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              className="mf-select peer w-full h-12 md:h-14 pt-5 pb-2 px-4 pr-11 rounded-xl bg-white/10 text-white border border-white/15 md:border-white/10 cursor-pointer hover:bg-white/15 hover:border-white/25 focus:outline-none"
            >
              <option value="UAE" className="text-gray-900">UAE</option>
              <option value="India" className="text-gray-900">India</option>
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-white/70">
              Country
            </label>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mf-select peer w-full h-12 md:h-14 pt-5 pb-2 px-4 pr-11 rounded-xl bg-white/10 text-white border border-white/15 md:border-white/10 cursor-pointer hover:bg-white/15 hover:border-white/25 focus:outline-none"
            >
              <option value="" className="text-gray-900">Select City</option>
              {cities.map((c) => (
                <option key={c} value={c} className="text-gray-900">{c}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-white/70">
              City
            </label>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="relative">
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="mf-select peer w-full h-12 md:h-14 pt-5 pb-2 px-4 pr-11 rounded-xl bg-white/10 text-white border border-white/15 md:border-white/10 cursor-pointer hover:bg-white/15 hover:border-white/25 focus:outline-none"
            >
              <option value="" className="text-gray-900">All Types</option>
              <option value="Apartment" className="text-gray-900">Apartment</option>
              <option value="Villa" className="text-gray-900">Villa</option>
              <option value="Penthouse" className="text-gray-900">Penthouse</option>
              <option value="Townhouse" className="text-gray-900">Townhouse</option>
              <option value="Plot" className="text-gray-900">Plot</option>
              <option value="Commercial" className="text-gray-900">Commercial</option>
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-white/70">
              Property Type
            </label>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder=" "
              className="peer w-full h-12 md:h-14 pt-5 pb-2 px-4 rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/15 md:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
            />
            <label
              className={`pointer-events-none absolute left-4 transition-all ${
                minPrice
                  ? 'top-2 text-[11px] font-medium text-white/70'
                  : 'top-1/2 -translate-y-1/2 text-sm text-white/60'
              }`}
            >
              Min Price ({countryMeta.currencyLabel})
            </label>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder=" "
              className="peer w-full h-12 md:h-14 pt-5 pb-2 px-4 rounded-xl bg-white/10 text-white placeholder:text-white/40 border border-white/15 md:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-yellow/70"
            />
            <label
              className={`pointer-events-none absolute left-4 transition-all ${
                maxPrice
                  ? 'top-2 text-[11px] font-medium text-white/70'
                  : 'top-1/2 -translate-y-1/2 text-sm text-white/60'
              }`}
            >
              Max Price ({countryMeta.currencyLabel})
            </label>
          </div>
        </div>

        <div className="md:col-span-1 flex items-stretch">
          <button
            type="submit"
            className="w-full h-12 md:h-14 bg-accent-yellow text-dark-blue rounded-xl font-semibold hover:bg-accent-yellow/90 transition-colors"
          >
            Browse Properties
          </button>
        </div>
      </div>
    </form>
  )
}
