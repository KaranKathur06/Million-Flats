import { buildHeroBannerCityOptions, inventoryCityOptionValue } from '@/lib/heroBannerCityOptions'

describe('hero banner inventory city options', () => {
  it('unions canonical cities, active property cities, and published project cities', () => {
    const result = buildHeroBannerCityOptions({
      countryCode: 'INDIA',
      canonicalCities: [{ id: 'mumbai-id', name: 'Mumbai' }],
      propertyCities: [{ name: 'Ahmedabad' }, { name: 'Mumbai' }],
      projectCities: [{ name: 'Dubai' }, { name: 'AHMEDABAD' }],
    })

    expect(result.map((city) => city.name)).toEqual(['Ahmedabad', 'Dubai', 'Mumbai'])
    expect(result.find((city) => city.name === 'Ahmedabad')?.sources).toEqual(['PROPERTIES', 'PROJECTS'])
    expect(result.find((city) => city.name === 'Mumbai')?.id).toBe('mumbai-id')
  })

  it('deduplicates city names case-insensitively and preserves a canonical id', () => {
    const result = buildHeroBannerCityOptions({
      countryCode: 'UAE',
      canonicalCities: [{ id: 'dubai-id', name: 'Dubai' }],
      propertyCities: [{ name: 'DUBAI' }],
      projectCities: [{ name: 'Dubai' }],
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'dubai-id', name: 'Dubai', countryCode: 'UAE', sources: ['LOCATION', 'PROPERTIES', 'PROJECTS'] })
  })

  it('creates a stable selectable value for inventory-only cities', () => {
    const result = buildHeroBannerCityOptions({ countryCode: 'INDIA', canonicalCities: [], propertyCities: [{ name: 'Rajkot' }], projectCities: [] })
    expect(inventoryCityOptionValue(result[0])).toBe('inventory:INDIA:Rajkot')
  })
})