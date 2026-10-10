jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
    },
    marketPriority: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    cityPriority: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { clearPriorityCache, getProjectListing } from '@/lib/services/ProjectListingService'

const db = prisma as any

describe('getProjectListing', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await clearPriorityCache()

    db.marketPriority.count.mockResolvedValue(1)
    db.marketPriority.findMany.mockResolvedValue([
      { countryIso2: 'AE', priority: 1 },
      { countryIso2: 'IN', priority: 2 },
    ])
    db.cityPriority.count.mockResolvedValue(1)
    db.cityPriority.findMany.mockResolvedValue([
      { countryIso2: 'AE', cityName: 'Dubai', priority: 1 },
    ])
  })

  it('ranks scalar rows first, then loads relations only for the requested page', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const projectsForRanking = [
      {
        id: 'india-project',
        countryIso2: 'IN',
        city: 'Mumbai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt,
      },
      {
        id: 'uae-project',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt,
      },
    ]
    const pageProject = { id: 'uae-project', name: 'UAE project', media: [] }
    db.project.findMany
      .mockResolvedValueOnce(projectsForRanking)
      .mockResolvedValueOnce([pageProject])

    const result = await getProjectListing({
      where: { city: 'Dubai' },
      take: 1,
      include: { media: true },
    })

    expect(db.project.findMany).toHaveBeenCalledTimes(2)
    expect(db.project.findMany.mock.calls[0][0]).toEqual({
      where: { status: 'PUBLISHED', isDeleted: false, city: 'Dubai' },
      select: {
        id: true,
        countryIso2: true,
        city: true,
        isPinned: true,
        pinPriority: true,
        listingPriority: true,
        createdAt: true,
      },
    })
    expect(db.project.findMany.mock.calls[1][0]).toEqual({
      where: {
        status: 'PUBLISHED',
        isDeleted: false,
        city: 'Dubai',
        id: { in: ['uae-project'] },
      },
      include: {
        developer: { select: { id: true, name: true } },
        media: true,
      },
    })
    expect(result).toEqual([pageProject])
  })

  it('skips the relation query when pagination contains no projects', async () => {
    db.project.findMany.mockResolvedValueOnce([])

    await expect(getProjectListing({ take: 24 })).resolves.toEqual([])

    expect(db.project.findMany).toHaveBeenCalledTimes(1)
  })
})
