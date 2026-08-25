import {
  calculateManualListingQuality,
  categoryForPropertyType,
  countryIso2ForCountry,
  defaultCurrencyForCountry,
  orderManualPropertyMedia,
  validateManualPropertyStep,
  visibleManualPropertyFields,
} from '@/lib/manualPropertyForm'

describe('manual property form rules', () => {
  it('maps supported types to categories and fields', () => {
    expect(categoryForPropertyType('Apartment')).toBe('RESIDENTIAL')
    expect(categoryForPropertyType('Plot')).toBe('LAND')
    expect(visibleManualPropertyFields({ propertyType: 'Plot', category: 'LAND' }).has('bedrooms')).toBe(false)
    expect(visibleManualPropertyFields({ propertyType: 'Apartment', category: 'RESIDENTIAL' }).has('bedrooms')).toBe(true)
  })

  it('suggests country currencies without blocking cross-border overrides', () => {
    expect(defaultCurrencyForCountry('India')).toBe('INR')
    expect(defaultCurrencyForCountry('UAE')).toBe('AED')
    expect(countryIso2ForCountry('India')).toBe('IN')
    expect(countryIso2ForCountry('UAE')).toBe('AE')
  })

  it('keeps sale and rent pricing validation distinct', () => {
    const base = {
      category: 'RESIDENTIAL' as const,
      propertyType: 'Apartment',
      title: 'Apartment in Dubai Marina',
      price: 12000,
      squareFeet: 1200,
      shortDescription: 'A bright apartment with excellent access to transit, dining, and waterfront amenities.',
    }
    expect(validateManualPropertyStep('basics', { ...base, intent: 'RENT' }).price).toBeUndefined()
    expect(validateManualPropertyStep('basics', { ...base, intent: 'SALE' }).price).toBeUndefined()
    expect(validateManualPropertyStep('basics', { ...base }).intent).toContain('sale or rent')
  })

  it('orders cover media before other media', () => {
    const ordered = orderManualPropertyMedia([
      { category: 'OTHER', position: 0 },
      { category: 'COVER', position: 4 },
      { category: 'EXTERIOR', position: 1 },
    ])
    expect(ordered.map((item) => item.category)).toEqual(['COVER', 'OTHER', 'EXTERIOR'])
  })

  it('validates land without residential bedroom requirements', () => {
    const errors = validateManualPropertyStep('basics', {
      category: 'LAND',
      propertyType: 'Plot',
      intent: 'SALE',
      title: 'Residential plot in Pune',
      price: 1200000,
      squareFeet: 1800,
      shortDescription: 'A clearly described residential plot with access to roads and utilities in a developed area.',
    })
    expect(errors.bedrooms).toBeUndefined()
    expect(errors.price).toBeUndefined()
  })

  it('weights meaningful listing quality fields', () => {
    const result = calculateManualListingQuality({
      title: '3BR Apartment in Dubai Marina',
      propertyType: 'Apartment',
      intent: 'RENT',
      price: 12000,
      squareFeet: 1400,
      city: 'Dubai',
      community: 'Dubai Marina',
      latitude: 25.08,
      longitude: 55.14,
      shortDescription: 'A bright, well-maintained apartment close to transit, dining, and waterfront amenities.',
      media: [{ category: 'COVER' }],
    })
    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.items.find((item) => item.key === 'amenities')?.complete).toBe(false)
  })
})