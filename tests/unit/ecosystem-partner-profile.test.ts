import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ecosystemPartner: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getPartnerProfile } from '@/lib/ecosystem/partnerProfile'

const findPartner = jest.mocked(prisma.ecosystemPartner.findFirst)

describe('ecosystem partner profile projection', () => {
  beforeEach(() => {
    findPartner.mockReset()
  })

  it('does not invent services, trust claims, FAQs, or partner branding when data is missing', async () => {
    findPartner.mockResolvedValue({
      id: 'partner-1',
      name: 'Example Finance',
      slug: 'example-finance',
      tagline: null,
      shortDescription: null,
      description: null,
      logo: null,
      coverImage: null,
      isVerified: false,
      partnerSince: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      category: { slug: 'home-loans-finance', title: 'Home Loans & Finance' },
      services: [],
      locations: [],
      gallery: [],
      portfolios: [],
      reviews: [],
      faqs: [],
      whyChoose: null,
      workProcess: null,
      categoryData: null,
      locationCoverage: null,
      pricingRange: null,
      projectsCompleted: null,
      yearsExperience: null,
      rating: null,
      teamSize: null,
      experienceDisplay: null,
    } as never)

    const profile = await getPartnerProfile('home-loans-finance', 'example-finance')

    expect(profile).toMatchObject({
      name: 'Example Finance',
      logo: null,
      coverImage: null,
      partnerSince: null,
      services: [],
      whyChoose: [],
      workProcess: [],
      faqs: [],
      description: null,
      tagline: 'Explore Home Loans & Finance services from Example Finance.',
    })
  })

  it('projects only explicitly public registered category fields', async () => {
    findPartner.mockResolvedValue({
      id: 'partner-1',
      name: 'Example Finance',
      slug: 'example-finance',
      tagline: null,
      shortDescription: null,
      description: null,
      logo: null,
      coverImage: null,
      isVerified: false,
      partnerSince: null,
      category: { slug: 'home-loans-finance', title: 'Home Loans & Finance' },
      services: [],
      locations: [],
      gallery: [],
      portfolios: [],
      reviews: [],
      faqs: [],
      whyChoose: null,
      workProcess: null,
      categoryData: {
        loanTypes: ['Home Loan'],
        interestRateMin: 8.25,
        processingFee: '1% of the loan amount',
        contactEmail: 'private@example.com',
        unregisteredField: 'do not expose',
      },
    } as never)

    const profile = await getPartnerProfile('home-loans-finance', 'example-finance')

    expect(profile?.categorySpecificData).toEqual({
      loanTypes: ['Home Loan'],
      interestRateMin: 8.25,
    })
  })
})
