import { describe, expect, it } from '@jest/globals'
import {
  PROPERTY_PROJECT_PLACEHOLDER,
  resolvePropertyImage,
  resolvePropertyImages,
} from '@/lib/propertyImages'

describe('property image fallback', () => {
  it('uses the project/property placeholder for absent or blank paths', () => {
    expect(resolvePropertyImage(null)).toBe(PROPERTY_PROJECT_PLACEHOLDER)
    expect(resolvePropertyImage('   ')).toBe(PROPERTY_PROJECT_PLACEHOLDER)
    expect(resolvePropertyImages({ propertyType: 'Apartment', images: [], seed: 'one' })).toEqual([
      PROPERTY_PROJECT_PLACEHOLDER,
    ])
    expect(resolvePropertyImages({ propertyType: 'Apartment', images: [null, '', '  '], seed: 'two' })).toEqual([
      PROPERTY_PROJECT_PLACEHOLDER,
    ])
  })

  it('preserves explicitly supplied image paths while removing blank entries', () => {
    const explicitImage = 'https://cdn.example.test/property.jpg'
    expect(resolvePropertyImage(explicitImage)).toBe(explicitImage)
    expect(
      resolvePropertyImages({
        propertyType: 'Apartment',
        images: [null, '', '  ', explicitImage],
        seed: 'three',
      })
    ).toEqual([explicitImage])
  })
})
