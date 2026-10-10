import {
  getProjectsHeroPresentation,
  PROJECTS_HERO_FALLBACK_IMAGE,
} from '@/app/projects/heroPresentation'
import type { ResolvedHeroBanner } from '@/lib/heroBanners'

function createBanner(overrides: Partial<ResolvedHeroBanner> = {}): ResolvedHeroBanner {
  return {
    desktopImage: 'https://cdn.example.com/projects.jpg',
    mobileImage: null,
    desktopAlt: 'Premium projects',
    mobileAlt: 'Premium projects',
    headline: 'Discover Premium Projects',
    subheadline: 'Browse premium developments.',
    source: 'GLOBAL_DEFAULT',
    ...overrides,
  }
}

describe('Projects hero presentation', () => {
  it('uses a wide mobile frame and restrained desktop crop for global artwork', () => {
    const presentation = getProjectsHeroPresentation(createBanner())

    expect(presentation.aspectClass).toBe('aspect-[3/1]')
    expect(presentation.imageClass).toContain('lg:scale-[1.1]')
    expect(presentation.imageClass).toContain('lg:object-[center_60%]')
  })

  it('uses the mobile-art aspect ratio when a mobile image is configured', () => {
    const presentation = getProjectsHeroPresentation(createBanner({
      mobileImage: 'https://cdn.example.com/projects-mobile.jpg',
    }))

    expect(presentation.aspectClass).toBe('aspect-[15/8] md:aspect-[21/7]')
  })

  it('does not zoom contextual banners or the legacy fallback artwork', () => {
    const cityBanner = getProjectsHeroPresentation(createBanner({ source: 'CITY_CATEGORY' }))
    const legacyFallback = getProjectsHeroPresentation(createBanner({
      desktopImage: PROJECTS_HERO_FALLBACK_IMAGE,
    }))

    expect(cityBanner.imageClass).not.toContain('lg:scale-[1.1]')
    expect(legacyFallback.imageClass).not.toContain('lg:scale-[1.1]')
  })
})
