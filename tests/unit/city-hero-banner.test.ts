jest.mock('next/cache', () => ({
  unstable_cache: (callback: (...args: any[]) => any) => callback,
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    city: { findMany: jest.fn() },
    heroBanner: { findMany: jest.fn() },
    project: { findFirst: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { MEDIA_FALLBACKS } from '@/lib/media/resolveMedia'
import { resolveCityScopedHeroBanner } from '@/lib/heroBanners'

const cityFindMany = prisma.city.findMany as jest.Mock
const bannerFindMany = prisma.heroBanner.findMany as jest.Mock
const projectFindFirst = prisma.project.findFirst as jest.Mock

describe('city-scoped project hero selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cityFindMany.mockResolvedValue([{
      id: 'city-mumbai',
      name: 'Mumbai',
      countryCode: 'INDIA',
      communities: [{ name: 'Bandra' }],
    }])
    bannerFindMany.mockResolvedValue([])
    projectFindFirst.mockResolvedValue({
      coverImage: MEDIA_FALLBACKS.project,
      media: [],
      developer: { banner: '/mumbai-developer-banner.jpg' },
    })
  })

  it('uses a city/category banner before project and developer media', async () => {
    bannerFindMany.mockResolvedValue([{
      scopeKey: 'city:city-mumbai',
      category: 'PROJECTS',
      desktopImageUrl: '/mumbai-configured-banner.jpg',
      desktopImageAlt: 'Mumbai projects',
    }])

    const result = await resolveCityScopedHeroBanner('PROJECTS', 'Mumbai', 'IN')

    expect(result.source).toBe('CITY_CATEGORY')
    expect(result.desktopImage).toBe('/mumbai-configured-banner.jpg')
    expect(projectFindFirst).not.toHaveBeenCalled()
  })

  it('chooses a published project inside the exact city scope and uses its developer banner if its image is only a fallback', async () => {
    const result = await resolveCityScopedHeroBanner('PROJECTS', 'Mumbai', 'IN')

    expect(result.source).toBe('CITY')
    expect(result.desktopImage).toBe('/mumbai-developer-banner.jpg')
    expect(projectFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PUBLISHED',
        isDeleted: false,
        countryIso2: 'IN',
      }),
      orderBy: [
        { isFeatured: 'desc' },
        { featuredOrder: 'asc' },
        { listingPriority: 'asc' },
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
    }))
  })
})
