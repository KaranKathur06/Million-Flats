import { describe, expect, it } from '@jest/globals'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import { getImportAdapter, getImportAdapterForEntity, importRegistry, registerImportAdapter } from '@/lib/imports/registry'
import { developerImportAdapter } from '@/lib/imports/adapters/developer/adapter'
import { ecosystemPartnerImportAdapter } from '@/lib/imports/adapters/ecosystem-partner/adapter'

describe('import registry', () => {
  it('exposes the property adapter by default and allows explicit registration', () => {
    expect(importRegistry.get('property')).toBe(propertyImportAdapter)
    expect(getImportAdapter('property')).toBe(propertyImportAdapter)

    const adapter = { ...propertyImportAdapter, key: 'custom-property' }
    registerImportAdapter(adapter)

    expect(getImportAdapter('custom-property')).toBe(adapter)
  })

  it('normalizes adapter keys across case and separator variants', () => {
    const adapter = { ...propertyImportAdapter, key: 'Property Variant' }
    registerImportAdapter(adapter)

    expect(getImportAdapter('Property Variant')).toBe(adapter)
    expect(getImportAdapter('property-variant')).toBe(adapter)
    expect(getImportAdapter('PROPERTY_VARIANT')).toBe(adapter)
  })

  it('resolves each entity only to its canonical adapter', () => {
    expect(getImportAdapterForEntity('DEVELOPER')).toBe(developerImportAdapter)
    expect(getImportAdapterForEntity('ecosystem-partner')).toBe(ecosystemPartnerImportAdapter)
    expect(getImportAdapterForEntity('unknown')).toBeNull()
  })

  it('detects the SquareYards property source profile from real scraper fields', () => {
    const detection = propertyImportAdapter.detectSourceProfile?.({
      fields: ['listingId', 'url', 'title', 'description', 'price', 'priceText', 'bedrooms', 'areaSqft', 'floorLevel', 'possessionStatus', 'projectName', 'locality', 'city', 'latitude', 'longitude', 'imageUrl', 'scrapedAt'],
      sample: {
        listingId: '10583565',
        url: 'https://www.squareyards.com/property/mumbai/10583565',
        title: '2 BHK Apartment',
        price: 7800000,
        priceText: '₹ 78 L',
        bedrooms: '2',
        areaSqft: 1200,
        floorLevel: '12',
        possessionStatus: 'Ready To Move',
        projectName: 'Example Project',
        locality: 'Example Locality',
        city: 'Mumbai',
        latitude: 19.123,
        longitude: 72.123,
        imageUrl: 'https://img.squareyards.com/cover.jpg',
        scrapedAt: '2026-08-28T18:20:06.014Z',
      },
    })

    expect(detection?.detected).toBe(true)
    expect(detection?.sourceProfileKey).toBe('squareyards-property-v1')
    expect(detection?.confidence).toBeGreaterThan(0.7)
  })
})
