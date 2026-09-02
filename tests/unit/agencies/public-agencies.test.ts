import { describe, expect, it } from '@jest/globals'
import { mergeAgencyDirectoryRows } from '@/lib/agencies/getPublicAgencies'

describe('agency directory merge logic', () => {
  it('keeps approved agency profiles and imported agency records visible without duplication', () => {
    const merged = mergeAgencyDirectoryRows(
      [
        {
          id: 'profile-1',
          agencyName: 'Square Yards',
          slug: 'square-yards',
          logo: null,
          banner: null,
          country: 'India',
          city: 'Mumbai',
          shortDescription: 'Approved agency profile',
          specializations: ['Residential'],
          onboardingStatus: 'APPROVED',
          isVerified: true,
          isFeatured: true,
          yearEstablished: 2010,
          totalListings: 12,
          totalClosedDeals: 3,
        },
      ],
      [
        {
          id: 'agency-1',
          name: 'Square Yards',
          countryCode: 'INDIA',
          countryIso2: 'IN',
          isFeatured: true,
        },
        {
          id: 'agency-2',
          name: 'Investors Clinic',
          countryCode: 'UAE',
          countryIso2: 'AE',
          isFeatured: false,
        },
      ],
    )

    expect(merged.map((agency) => agency.agencyName)).toEqual(
      expect.arrayContaining(['Square Yards', 'Investors Clinic'])
    )
    expect(merged.filter((agency) => agency.agencyName === 'Square Yards')).toHaveLength(1)
  })
})
