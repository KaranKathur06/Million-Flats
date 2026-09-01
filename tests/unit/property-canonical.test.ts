import { canonicalizePropertyImport, getCityOptions, getCommunityOptions, getCountryOptions, normalizeLocationPair } from '../../lib/propertyCanonical'
import { resolvePropertyCurrency, resolvePropertyImportIntent } from '../../lib/imports/adapters/property/adapter'

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

  it('applies the selected bulk-import intent when the source record has no explicit intent', () => {
    expect(resolvePropertyImportIntent({ title: 'Sample property' }, 'RENT')).toBe('RENT')
    expect(resolvePropertyImportIntent({ title: 'Sample property', intent: 'SALE' }, 'RENT')).toBe('SALE')
    expect(resolvePropertyImportIntent({ title: 'Sample property', listingType: 'For Rent' }, 'SALE')).toBe('RENT')
  })

  it('uses the country/city to derive the correct default currency for imported properties', () => {
    expect(resolvePropertyCurrency({ city: 'Mumbai', countryCode: 'INDIA' })).toBe('INR')
    expect(resolvePropertyCurrency({ city: 'Dubai', countryCode: 'UAE' })).toBe('AED')
    expect(resolvePropertyCurrency({ city: 'Chembur', countryIso2: 'IN' })).toBe('INR')
  })

  it('keeps the property description from the XLSX import payload', () => {
    const result = canonicalizePropertyImport({
      schemaVersion: 'property-import-v1',
      property: {
        title: 'Luxury apartment in Navi Mumbai',
        propertyType: 'Apartment',
        intent: 'RENT',
        price: 45000,
        currency: 'INR',
        description: 'Spacious 2 BHK apartment with sea-facing balcony and clubhouse access in Navi Mumbai.',
        city: 'Navi Mumbai',
        community: 'Kharghar',
        country: 'India',
      },
    })

    expect(result.ok).toBe(true)
    expect(result.normalized?.description).toBe('Spacious 2 BHK apartment with sea-facing balcony and clubhouse access in Navi Mumbai.')
    expect(result.normalized?.shortDescription).toBeUndefined()
  })
})
