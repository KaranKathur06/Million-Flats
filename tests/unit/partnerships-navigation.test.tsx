import { describe, expect, it } from '@jest/globals'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import { ECOSYSTEM_CATEGORIES } from '@/lib/ecosystemPartners'

describe('partnerships redesign', () => {
  it('exposes the technology partners launch content in shared config', () => {
    const cfg = getEcosystemCategoryConfig('technology-partners')

    expect(cfg).toBeDefined()
    expect(cfg?.title).toBe('Technology Partners')
    expect(cfg?.benefits.some((benefit) => benefit.title === 'Built for Scale')).toBe(true)
    expect(cfg?.faqs.some((faq) => faq.question === 'Who should apply?')).toBe(true)
  })

  it('keeps the ecosystem category registry complete', () => {
    expect(ECOSYSTEM_CATEGORIES).toHaveLength(12)
    expect(ECOSYSTEM_CATEGORIES.some((category) => category.slug === 'technology-partners')).toBe(true)
    expect(ECOSYSTEM_CATEGORIES.some((category) => category.slug === 'tiles-surface-finishing')).toBe(true)
  })
})
