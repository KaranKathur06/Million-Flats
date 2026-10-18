jest.mock('@/lib/prisma', () => ({
  prisma: {
    city: { findMany: jest.fn() },
    project: { findMany: jest.fn(), count: jest.fn() },
  },
}))

jest.mock('@/lib/services/ProjectListingService', () => ({
  getProjectListing: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/search/projects/route'

const cityFindMany = prisma.city.findMany as jest.Mock
const projectFindMany = prisma.project.findMany as jest.Mock
const projectCount = prisma.project.count as jest.Mock

describe('city-scoped project search route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cityFindMany.mockResolvedValue([{
      id: 'city-mumbai',
      name: 'Mumbai',
      countryCode: 'INDIA',
      communities: [{ name: 'Bandra' }],
    }])
    projectFindMany.mockResolvedValue([])
    projectCount.mockResolvedValue(0)
  })

  it('uses one exact country/city/community scope for both results and total count', async () => {
    const response = await GET(new Request(
      'http://localhost/api/search/projects?city=Mumbai&country=IN&sortBy=newest&page=2&limit=24',
    ))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.total).toBe(0)
    const resultWhere = projectFindMany.mock.calls[0][0].where
    const countWhere = projectCount.mock.calls[0][0].where
    expect(resultWhere).toEqual(countWhere)
    expect(resultWhere.AND).toEqual(expect.arrayContaining([
      expect.objectContaining({
        countryIso2: 'IN',
        OR: expect.arrayContaining([
          { city: { equals: 'Mumbai', mode: 'insensitive' } },
          { city: { equals: 'Bandra', mode: 'insensitive' } },
          { community: { equals: 'Bandra', mode: 'insensitive' } },
        ]),
      }),
    ]))
  })
})
