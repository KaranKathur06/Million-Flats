import { normalizeText, normalizeTitleCase } from '@/lib/propertyCanonical'

export type HeroBannerCitySource = 'LOCATION' | 'PROPERTIES' | 'PROJECTS'

export type HeroBannerCityOption = {
  id: string | null
  name: string
  countryCode: 'INDIA' | 'UAE'
  sources: HeroBannerCitySource[]
}

type CityNameRecord = { name: string; id?: string | null }

export function buildHeroBannerCityOptions(input: {
  countryCode: 'INDIA' | 'UAE'
  canonicalCities: CityNameRecord[]
  propertyCities: CityNameRecord[]
  projectCities: CityNameRecord[]
}): HeroBannerCityOption[] {
  const cities = new Map<string, HeroBannerCityOption>()
  const add = (records: CityNameRecord[], source: HeroBannerCitySource) => {
    for (const record of records) {
      const name = normalizeTitleCase(normalizeText(record.name))
      const key = name.toLocaleLowerCase('en')
      if (!name || !key) continue
      const current = cities.get(key)
      if (current) {
        if (record.id) current.id = record.id
        if (!current.sources.includes(source)) current.sources.push(source)
        continue
      }
      cities.set(key, {
        id: record.id || null,
        name,
        countryCode: input.countryCode,
        sources: [source],
      })
    }
  }

  add(input.canonicalCities, 'LOCATION')
  add(input.propertyCities, 'PROPERTIES')
  add(input.projectCities, 'PROJECTS')

  return Array.from(cities.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function inventoryCityOptionValue(option: HeroBannerCityOption) {
  return option.id || `inventory:${option.countryCode}:${encodeURIComponent(option.name)}`
}