import { describe, expect, it } from '@jest/globals'
import {
  PROPERTY_MEDIA_ALLOWED_TYPES,
  PROPERTY_MEDIA_CATEGORIES,
  propertyMediaCategory,
  propertyMediaStorageCategory,
} from '@/lib/propertyMedia'

describe('property media taxonomy', () => {
  it('uses the shared project-style category set for property images', () => {
    expect(PROPERTY_MEDIA_CATEGORIES).toEqual([
      'hero',
      'exterior',
      'amenities',
      'lifestyle',
      'floor_plan',
    ])
  })

  it('maps shared categories to existing ManualPropertyMedia storage enums', () => {
    expect(propertyMediaStorageCategory('hero')).toBe('COVER')
    expect(propertyMediaStorageCategory('floor_plan')).toBe('FLOOR_PLANS')
    expect(propertyMediaCategory('COVER')).toBe('hero')
    expect(propertyMediaCategory('FLOOR_PLANS')).toBe('floor_plan')
    expect(propertyMediaCategory('INTERIOR')).toBe('other')
  })

  it('allows modern image formats without allowing arbitrary URLs or files', () => {
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/jpeg')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/webp')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/avif')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).not.toContain('application/pdf')
  })
})
