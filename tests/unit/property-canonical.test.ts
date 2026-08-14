import { canonicalizePropertyImport, getCityOptions, getCommunityOptions, getCountryOptions, normalizeLocationPair } from '../../lib/propertyCanonical'

describe('property canonical model', () => {
  it('exposes India and UAE as supported countries', () => {
    const countries = getCountryOptions().map((item) => item.value)
    expect(countries).toContain('IN')
    expect(countries).toContain('AE')
  })

  it('normalizes city/community location values', () => {
    expect(normalizeLocationPair('India', 'navi mumbai', 'KHARGHAR')).toEqual({
      country: 'India',
      countryCode: 'IN',
      city: 'Navi Mumbai',
      community: 'Kharghar',
    })
  })

  it('returns canonical city and community options for the supported locations', () => {
    expect(getCityOptions('IN').some((city) => city.name === 'Navi Mumbai')).toBe(true)
    expect(getCommunityOptions('IN', 'Navi Mumbai').some((community) => community.name === 'Kharghar')).toBe(true)
  })

  it('includes fallback locations used by imported India property feeds', () => {
    expect(getCityOptions('IN').some((city) => city.name === 'Alibaug')).toBe(true)
    expect(getCommunityOptions('IN', 'Navi Mumbai').some((community) => community.name === 'Bhokarpada')).toBe(true)
    expect(getCommunityOptions('IN', 'Navi Mumbai').some((community) => community.name === 'Juinagar')).toBe(true)
    expect(getCommunityOptions('IN', 'Navi Mumbai').some((community) => community.name === 'Seawoods')).toBe(true)
  })

  it('rejects image URL fields in the scraper/bulk-import contract', () => {
    const result = canonicalizePropertyImport({
      schemaVersion: 'property-import-v1',
      property: {
        title: 'Sample Property',
        propertyType: 'APARTMENT',
        intent: 'SALE',
        price: { min: 1000000, currency: 'INR' },
        bedrooms: 2,
        bathrooms: 2,
        area: { value: 1100, unit: 'SQFT' },
        location: { country: 'India', city: 'Navi Mumbai', community: 'Kharghar' },
        developer: 'Example Developer',
        description: 'Nice property',
        amenities: ['Gym'],
        imageUrl: 'https://example.com/cover.png',
      },
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Unsupported field: imageUrl')
  })
})
