jest.mock('next/cache', () => ({
  unstable_cache: (callback: (...args: any[]) => any) => callback,
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    city: { findMany: jest.fn() },
    heroBanner: { findMany: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { canonicalCityCandidates, resolveHeroBanner } from '@/lib/heroBanners'

const cityFindMany = (prisma as any).city.findMany as jest.Mock
const bannerFindMany = (prisma as any).heroBanner.findMany as jest.Mock

function banner(scopeKey: string, category: string, overrides: Record<string, unknown> = {}) {
  return {
    scopeKey,
    category,
    scope: scopeKey === 'global' ? 'GLOBAL' : scopeKey.startsWith('city:') ? 'CITY' : 'COUNTRY',
    desktopImageUrl: '/configured-hero.jpg',
    mobileImageUrl: null,
    desktopImageAlt: 'Configured properties',
    mobileImageAlt: null,
    headline: 'Configured headline',
    subheadline: 'Configured subheadline',
    ...overrides,
  }
}

describe('hero banner resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cityFindMany.mockResolvedValue([{ id: 'city-mumbai', name: 'Mumbai', countryCode: 'INDIA' }])
    bannerFindMany.mockResolvedValue([])
  })

  it('normalizes case, hyphenated city names, and comma-qualified cities into search candidates', () => {
    expect(canonicalCityCandidates('MUMBAI')).toContain('mumbai')
    expect(canonicalCityCandidates('mumbai-city')).toContain('mumbai')
    expect(canonicalCityCandidates('Mumbai, Maharashtra')).toContain('mumbai')
  })

  it('selects the exact city and category banner first', async () => {
    bannerFindMany.mockResolvedValue([
      banner('city:city-mumbai', 'BUY'),
      banner('country:INDIA', 'BUY'),
      banner('global', 'BUY'),
    ])

    const result = await resolveHeroBanner({ category: 'BUY', city: 'mumbai', country: 'INDIA' })

    expect(result.source).toBe('CITY_CATEGORY')
    expect(result.desktopImage).toBe('/configured-hero.jpg')
  })

  it('falls through city generic and country defaults when exact city/category is missing', async () => {
    bannerFindMany.mockResolvedValue([
      banner('city:city-mumbai', 'GENERIC'),
      banner('country:INDIA', 'BUY'),
      banner('global', 'BUY'),
    ])

    const result = await resolveHeroBanner({ category: 'BUY', city: 'Mumbai', country: 'INDIA' })

    expect(result.source).toBe('CITY')
  })

  it('uses the country category fallback if the city has no active banner', async () => {
    bannerFindMany.mockResolvedValue([
      banner('country:INDIA', 'RENT'),
      banner('global', 'RENT'),
    ])

    const result = await resolveHeroBanner({ category: 'RENT', city: 'Mumbai', country: 'INDIA' })

    expect(result.source).toBe('COUNTRY_CATEGORY')
    expect(result.headline).toBe('Configured headline')
  })

  it('uses the global default for unknown cities and no-city searches', async () => {
    cityFindMany.mockResolvedValue([])
    bannerFindMany.mockResolvedValue([banner('global', 'BUY')])

    const unknownCityResult = await resolveHeroBanner({ category: 'BUY', city: 'random-city', country: 'INDIA' })
    const noCityResult = await resolveHeroBanner({ category: 'BUY' })

    expect(unknownCityResult.source).toBe('GLOBAL_DEFAULT')
    expect(noCityResult.source).toBe('GLOBAL_DEFAULT')
    expect(bannerFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }))
  })

  it('skips malformed image URLs and continues to the global default', async () => {
    bannerFindMany.mockResolvedValue([
      banner('city:city-mumbai', 'BUY', { desktopImageUrl: 'javascript:alert(1)' }),
      banner('global', 'BUY', { desktopImageUrl: '/master.jpg' }),
    ])

    const result = await resolveHeroBanner({ category: 'BUY', city: 'Mumbai', country: 'INDIA' })

    expect(result.source).toBe('GLOBAL_DEFAULT')
    expect(result.desktopImage).toBe('/master.jpg')
  })

  it('preserves the project gradient fallback when no global project image is configured', async () => {
    bannerFindMany.mockResolvedValue([banner('global', 'PROJECTS', { desktopImageUrl: null })])

    const result = await resolveHeroBanner({ category: 'PROJECTS' })

    expect(result.source).toBe('GLOBAL_DEFAULT')
    expect(result.desktopImage).toBeNull()
  })
})