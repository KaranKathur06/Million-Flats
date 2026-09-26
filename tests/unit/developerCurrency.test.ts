import { buildDeveloperPriceRange } from '@/lib/developers/developerPricing'

describe('buildDeveloperPriceRange', () => {
  it('converts developer pricing into the user-selected display currency without mutating the source data', () => {
    const range = buildDeveloperPriceRange({
      minPrice: 1000000,
      maxPrice: 2500000,
      sourceCurrency: 'AED',
      displayCurrency: 'INR',
    })

    expect(range).toBe('₹2,25,00,000 - ₹5,62,50,000')
  })
})
