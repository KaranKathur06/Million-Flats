import { describe, expect, it } from '@jest/globals'
import { SERVICE_SEGMENTS, ECOSYSTEM_PACKAGES } from '@/lib/services/segmentContent'
import { ECOSYSTEM_CATEGORIES } from '@/lib/ecosystemPartners'

describe('service segment content', () => {
  it('preserves required segment packages and supplied annual rates', () => {
    expect(SERVICE_SEGMENTS.developers.packages.map(({ name, price }) => [name, price])).toEqual([
      ['Annual Essential', '₹99,000'],
      ['360° AI Growth Suite', '₹1,75,000'],
    ])
    expect(SERVICE_SEGMENTS.agencies.packages[0].name).toBe('Boutique Agency Suite')
    expect(SERVICE_SEGMENTS.agencies.packages[0].features).toHaveLength(5)
    expect(SERVICE_SEGMENTS.agents.packages[0].name).toBe('Agent Pro AI Suite')
    expect(SERVICE_SEGMENTS.agents.packages[0].features.map(({ title }) => title)).toContain('AIPro™ Verified Agent Badge')
  })

  it('keeps all twelve partner verticals and both supplied partner package structures', () => {
    expect(ECOSYSTEM_CATEGORIES).toHaveLength(12)
    expect(ECOSYSTEM_CATEGORIES.map(({ name }) => name)).toContain('Technology Partners')
    expect(ECOSYSTEM_PACKAGES[0].name).toBe('Verified Partner Suite')
    expect(ECOSYSTEM_PACKAGES[1].price).toBe('₹1,25,000 / YEAR')
  })
})