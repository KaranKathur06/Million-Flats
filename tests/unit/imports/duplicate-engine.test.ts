import { describe, expect, it } from '@jest/globals'
import { classifyPropertyDuplicate } from '@/lib/imports/duplicate'

describe('property duplicate engine', () => {
  it('distinguishes deterministic, strong, and advisory matches', () => {
    const target = { sourceProvider: 'Portal', sourceListingId: 'A-1', sourceUrl: 'https://example/a', title: 'Sky Villa', city: 'Dubai', community: 'Marina' }
    const result = classifyPropertyDuplicate(target, [
      { id: 'exact', sourceProvider: 'portal', sourceListingId: 'a-1' },
      { id: 'strong', sourceUrl: 'https://example/a' },
      { id: 'potential', title: ' sky villa ', city: 'DUBAI', community: 'marina' },
    ])

    expect(result).toEqual([
      expect.objectContaining({ targetId: 'exact', classification: 'EXACT_DUPLICATE', score: 1 }),
      expect.objectContaining({ targetId: 'strong', classification: 'STRONG_MATCH', score: 0.95 }),
      expect.objectContaining({ targetId: 'potential', classification: 'POTENTIAL_DUPLICATE', score: 0.7 }),
    ])
  })
})
