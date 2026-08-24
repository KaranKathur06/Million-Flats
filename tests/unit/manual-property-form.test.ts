import {
  calculateManualListingQuality,
  categoryForPropertyType,
  defaultCurrencyForCountry,
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