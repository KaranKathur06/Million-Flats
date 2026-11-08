import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/ecosystem/auth', () => ({
  getAuthenticatedEcosystemUser: jest.fn(),
}))

jest.mock('@/lib/ecosystem/fetchPublicPartners', () => ({
  fetchPublicPartners: jest.fn(),
}))

import { GET as getCanonicalDirectory } from '@/app/api/ecosystem/partners/route'
import { GET as getLegacyDirectory } from '@/app/api/ecosystem-partners/partners/route'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'

const authenticatedUser = getAuthenticatedEcosystemUser as jest.MockedFunction<typeof getAuthenticatedEcosystemUser>
const fetchPartners = fetchPublicPartners as jest.MockedFunction<typeof fetchPublicPartners>

describe('public ecosystem partner directory APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchPartners.mockResolvedValue({
      items: [{
        id: 'partner-1',
        name: 'Example Partner',
        slug: 'example-partner',
        logo: null,
        coverImage: null,
        shortDescription: null,
        rating: null,
        yearsExperience: null,
        projectsCompleted: null,
        locationCoverage: null,
        pricingRange: null,
        isFeatured: false,
        isVerified: true,
      }],
      total: 1,
      page: 1,
      take: 12,
      hasMore: false,
    })
  })

  it('serves the canonical directory to anonymous visitors', async () => {
    const response = await getCanonicalDirectory(
      new Request('https://millionflats.test/api/ecosystem/partners?slug=home-loans-finance')
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      total: 1,
      items: [{ id: 'partner-1', slug: 'example-partner' }],
    })
    expect(response.headers.get('cache-control')).toBe('no-store, must-revalidate')
    expect(fetchPartners).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: 'home-loans-finance' }))
    expect(authenticatedUser).not.toHaveBeenCalled()
  })

  it('serves the legacy directory alias to anonymous visitors', async () => {
    const response = await getLegacyDirectory(
      new Request('https://millionflats.test/api/ecosystem-partners/partners?slug=home-loans-finance')
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, total: 1 })
    expect(fetchPartners).toHaveBeenCalledWith(expect.objectContaining({ categorySlug: 'home-loans-finance' }))
    expect(authenticatedUser).not.toHaveBeenCalled()
  })
})
