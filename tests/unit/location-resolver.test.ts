import { resolveLocationCountry } from '@/lib/locationResolver'

describe('resolveLocationCountry', () => {
  const cases: Array<[Record<string, string>, string]> = [
    [{ city: 'Hyderabad' }, 'IN'],
    [{ city: 'Gurugram' }, 'IN'],
    [{ city: 'Dubai' }, 'AE'],
    [{ community: 'Gachibowli' }, 'IN'],
    [{ community: 'Downtown Dubai' }, 'AE'],
    [{ currency: 'INR' }, 'IN'],
    [{ currency: 'AED' }, 'AE'],
  ]

  for (const [input, countryIso2] of cases) {
    it(`resolves ${JSON.stringify(input)} as ${countryIso2}`, () => {
      expect(resolveLocationCountry(input).countryIso2).toBe(countryIso2)
      expect(resolveLocationCountry(input).needsReview).toBe(false)
    })
  }

  it('does not default unknown locations to UAE', () => {
    expect(resolveLocationCountry({ city: 'Unknown City', community: 'Unknown Community' })).toEqual({
      countryIso2: null,
      confidence: 'UNKNOWN',
      needsReview: true,
      reason: 'Country could not be determined from the supplied location data.',
    })
  })

  it('honors an explicit country over weaker location signals', () => {
    expect(resolveLocationCountry({ country: 'India', city: 'Dubai' }).countryIso2).toBe('IN')
  })
})
