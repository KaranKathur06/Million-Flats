import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/heroBanners', () => ({
  resolveHeroBanner: jest.fn(),
}))
jest.mock('@/app/projects/ProjectsGridClient', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('@/components/HeroBannerBackdrop', () => ({
  __esModule: true,
  default: () => null,
}))

import { resolveHeroBanner } from '@/lib/heroBanners'
import { generateMetadata } from '@/app/projects/page'

const mockedResolveHeroBanner = resolveHeroBanner as jest.MockedFunction<typeof resolveHeroBanner>

describe('Projects page social metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedResolveHeroBanner.mockResolvedValue({
      desktopImage: 'https://cdn.example.com/banners/dubai-projects.jpg',
      mobileImage: null,
      desktopAlt: 'Off-plan homes in Dubai',
      mobileAlt: 'Off-plan homes in Dubai',
      headline: 'Projects in Dubai',
      subheadline: 'Explore developments in Dubai.',
      source: 'CITY_CATEGORY',
    })
  })

  it('uses the contextual hero banner for both share-card formats', async () => {
    const metadata = await generateMetadata({
      searchParams: { city: 'Dubai', country: 'AE' },
    })

    expect(mockedResolveHeroBanner).toHaveBeenCalledWith({
      category: 'PROJECTS',
      city: 'Dubai',
      country: 'AE',
    })
    expect(metadata.openGraph?.images).toEqual([{
      url: 'https://cdn.example.com/banners/dubai-projects.jpg',
      alt: 'Off-plan homes in Dubai',
    }])
    expect(metadata.twitter?.images).toEqual([
      'https://cdn.example.com/banners/dubai-projects.jpg',
    ])
  })

  it('uses the visible hero fallback when no desktop banner is available', async () => {
    mockedResolveHeroBanner.mockResolvedValueOnce({
      desktopImage: null,
      mobileImage: null,
      desktopAlt: 'Projects banner',
      mobileAlt: 'Projects banner',
      headline: 'Projects',
      subheadline: 'Explore projects.',
      source: 'GLOBAL_DEFAULT',
    })

    const metadata = await generateMetadata({})

    expect(metadata.openGraph?.images).toEqual([{
      url: '/HOMEPAGE.jpeg',
      alt: 'Projects banner',
    }])
    expect(metadata.twitter?.images).toEqual(['/HOMEPAGE.jpeg'])
  })
})
