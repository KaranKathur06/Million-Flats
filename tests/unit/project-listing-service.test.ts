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

  it('applies recommended priorities in order and restores that order after loading relations', async () => {
    db.cityPriority.findMany.mockResolvedValueOnce([
      { countryIso2: 'AE', cityName: 'Dubai', priority: 1 },
      { countryIso2: 'AE', cityName: 'Abu Dhabi', priority: 2 },
      { countryIso2: 'IN', cityName: 'Mumbai', priority: 1 },
    ])

    const projectsForRanking = [
      {
        id: 'in-mumbai-pinned',
        countryIso2: 'IN',
        city: 'Mumbai',
        isPinned: true,
        pinPriority: 1,
        listingPriority: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-fallback-b',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-pinned-2',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: true,
        pinPriority: 2,
        listingPriority: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-abu-dhabi-pinned',
        countryIso2: 'AE',
        city: 'Abu Dhabi',
        isPinned: true,
        pinPriority: 1,
        listingPriority: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-pinned-1-old',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: true,
        pinPriority: 1,
        listingPriority: 1,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-unpinned-listing-2',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: 2,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-pinned-1-new',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: true,
        pinPriority: 1,
        listingPriority: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-unpinned-listing-1',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'ae-dubai-fallback-a',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]
    const expectedIds = [
      'ae-dubai-pinned-1-new',
      'ae-dubai-pinned-1-old',
      'ae-dubai-pinned-2',
      'ae-dubai-unpinned-listing-1',
      'ae-dubai-unpinned-listing-2',
      'ae-dubai-fallback-a',
      'ae-dubai-fallback-b',
      'ae-abu-dhabi-pinned',
      'in-mumbai-pinned',
    ]
    const projectsWithRelations = expectedIds.map((id) => ({ id, media: [] }))
    db.project.findMany
      .mockResolvedValueOnce(projectsForRanking)
      .mockResolvedValueOnce([...projectsWithRelations].reverse())

    const result = await getProjectListing({ include: { media: true } })

    expect(result.map((project: { id: string }) => project.id)).toEqual(expectedIds)
    expect(db.project.findMany.mock.calls[0][0]).toHaveProperty('select')
    expect(db.project.findMany.mock.calls[1][0].where.id.in).toEqual(expectedIds)
  })

  it('clamps negative recommended offsets and returns an empty page beyond the ranked results', async () => {
    const projectsForRanking = [
      {
        id: 'second',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        id: 'first',
        countryIso2: 'AE',
        city: 'Dubai',
        isPinned: false,
        pinPriority: null,
        listingPriority: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]
    const firstProject = { id: 'first', media: [] }
    db.project.findMany
      .mockResolvedValueOnce(projectsForRanking)
      .mockResolvedValueOnce([firstProject])
      .mockResolvedValueOnce(projectsForRanking)

    await expect(getProjectListing({ skip: -3, take: 1 })).resolves.toEqual([firstProject])
    await expect(getProjectListing({ skip: 10, take: 1 })).resolves.toEqual([])

    expect(db.project.findMany).toHaveBeenCalledTimes(3)
    expect(db.project.findMany.mock.calls[1][0].where.id.in).toEqual(['first'])
    expect(db.project.findMany.mock.calls[2][0]).toHaveProperty('select')
  })
})
