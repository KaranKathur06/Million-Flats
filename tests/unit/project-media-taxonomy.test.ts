import { describe, expect, it } from '@jest/globals'
import {
  PROJECT_MEDIA_CATEGORIES,
  PROJECT_MEDIA_CATEGORY_VALUES,
  isProjectMediaCategory,
  normalizeProjectMediaCategory,
} from '@/lib/projectMediaTaxonomy'

describe('project media taxonomy', () => {
  it('uses the canonical five image categories only', () => {
    expect(PROJECT_MEDIA_CATEGORIES).toEqual([
      'hero',
      'exterior',
      'other',
      'amenities',
      'lifestyle',
    ])
    expect(PROJECT_MEDIA_CATEGORIES).not.toContain('gallery')
  })

  it('keeps floor plan as a separate special-case category without reintroducing gallery', () => {
    expect(PROJECT_MEDIA_CATEGORY_VALUES).toEqual([
      'hero',
      'exterior',
      'amenities',
      'lifestyle',
      'floor_plan',
      'other',
    ])
    expect(isProjectMediaCategory('gallery')).toBe(false)
    expect(normalizeProjectMediaCategory('GALLERY')).toBeNull()
    expect(normalizeProjectMediaCategory('exterior')).toBe('exterior')
  })
})
