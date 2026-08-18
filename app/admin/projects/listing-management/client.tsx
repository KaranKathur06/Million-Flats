'use client'

import { useState, useEffect } from 'react'
import ProjectListingManagement from '@/components/admin/ProjectListingManagement'

interface Market {
  id: string
  countryIso2: string
  priority: number
  isActive: boolean
}

interface City {
  id: string
  countryIso2: string
  cityName: string
  priority: number
  isActive: boolean
}

interface ProjectListingManagementClientProps {
  markets: Market[]
  cities: Record<string, City[]>
}

export default function ProjectListingManagementClient({
  markets,
  cities,
}: ProjectListingManagementClientProps) {
  const [initialCountry, setInitialCountry] = useState<string>('')
  const [initialCity, setInitialCity] = useState<string>('')

  // Set initial country to first market
  useEffect(() => {
    if (markets.length > 0 && !initialCountry) {
      setInitialCountry(markets[0].countryIso2)
      // Set initial city to first city of first market
      const firstMarketCities = cities[markets[0].countryIso2]
      if (firstMarketCities && firstMarketCities.length > 0) {
        setInitialCity(firstMarketCities[0].cityName)
      }
    }
  }, [markets, cities, initialCountry])

  if (!initialCountry) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white/60">Loading...</p>
      </div>
    )
  }

  return (
    <ProjectListingManagement
      initialCountry={initialCountry}
      initialCity={initialCity}
      markets={markets}
      cities={cities}
    />
  )
}
