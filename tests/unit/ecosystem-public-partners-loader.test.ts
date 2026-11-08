import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ecosystemPartner: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/ecosystem/auth', () => ({
  getAuthenticatedEcosystemUser: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { fetchPublicPartners } from '@/lib/ecosystem/fetchPublicPartners'

const findMany = jest.mocked(prisma.ecosystemPartner.findMany)
const count = jest.mocked(prisma.ecosystemPartner.count)
const getUser = getAuthenticatedEcosystemUser as jest.MockedFunction<typeof getAuthenticatedEcosystemUser>

describe('public ecosystem partner loader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findMany.mockResolvedValue([])
    count.mockResolvedValue(0)
  })

  it('loads the approved public directory without resolving a session', async () => {
    const result = await fetchPublicPartners({ categorySlug: 'legal-documentation' })

    expect(result).toMatchObject({ items: [], total: 0, page: 1, take: 12, hasMore: false })
    expect(getUser).not.toHaveBeenCalled()
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'APPROVED',
        isActive: true,
        category: { slug: 'legal-documentation', isActive: true },
      }),
    }))
  })
})
