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
      'COVER',
      'EXTERIOR',
      'LIVING_ROOM',
      'BEDROOM',
      'KITCHEN',
      'BATHROOM',
      'VIEW',
      'AMENITIES',
      'FLOOR_PLANS',
      'OTHER',
    ])
  })

  it('accepts canonical and legacy values without lossy remapping', () => {
    expect(propertyMediaStorageCategory('COVER')).toBe('COVER')
    expect(propertyMediaStorageCategory('floor_plan')).toBe('FLOOR_PLANS')
    expect(propertyMediaCategory('COVER')).toBe('COVER')
    expect(propertyMediaCategory('FLOOR_PLANS')).toBe('FLOOR_PLANS')
    expect(propertyMediaCategory('INTERIOR')).toBe('OTHER')
  })

  it('allows modern image formats without allowing arbitrary URLs or files', () => {
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/jpeg')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/webp')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).toContain('image/avif')
    expect(PROPERTY_MEDIA_ALLOWED_TYPES).not.toContain('application/pdf')
  })
})
