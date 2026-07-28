import { getReferralOptions, normalizeReferralSource } from '@/lib/referrals'

describe('referral helpers', () => {
  it('normalizes known referral sources', () => {
    expect(normalizeReferralSource('LinkedIn')).toBe('linkedin')
    expect(normalizeReferralSource('  instagram  ')).toBe('instagram')
  })

  it('normalizes longer label-based values', () => {
    expect(normalizeReferralSource('Google Search')).toBe('google-search')
    expect(normalizeReferralSource('Partner / Agency')).toBe('partner')
  })

  it('returns the shared referral options list', () => {
    const options = getReferralOptions()
    expect(options[0]).toEqual({ value: 'google-search', label: 'Google Search' })
    expect(options).toContainEqual({ value: 'other', label: 'Other' })
  })
})
