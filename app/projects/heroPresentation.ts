import type { ResolvedHeroBanner } from '@/lib/heroBanners'

export const PROJECTS_HERO_FALLBACK_IMAGE = '/HOMEPAGE.jpeg'

export function getProjectsHeroPresentation(banner: ResolvedHeroBanner) {
    const usesMobileArtwork = Boolean(banner.mobileImage)
    const isGlobalProjectsArtwork =
        banner.source === 'GLOBAL_DEFAULT' &&
        Boolean(banner.desktopImage) &&
        banner.desktopImage !== PROJECTS_HERO_FALLBACK_IMAGE

    return {
        aspectClass: usesMobileArtwork
            ? 'aspect-[15/8] md:aspect-[21/7]'
            : 'aspect-[3/1]',
        imageClass: `h-full w-full object-cover object-center${isGlobalProjectsArtwork
            ? ' lg:scale-[1.1] lg:origin-center lg:object-[center_60%]'
            : ''}`,
    }
}
