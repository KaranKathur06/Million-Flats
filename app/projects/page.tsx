import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProjectsGridClient from './ProjectsGridClient'
import { resolveHeroBanner } from '@/lib/heroBanners'
import HeroBannerBackdrop from '@/components/HeroBannerBackdrop'
import type { ResolvedHeroBanner } from '@/lib/heroBanners'
import { getProjectsHeroPresentation, PROJECTS_HERO_FALLBACK_IMAGE } from './heroPresentation'

export const metadata: Metadata = {
    title: 'Off-Plan Projects | MillionFlats',
    description:
        'Discover premium off-plan developments across Dubai and the UAE. Browse luxury projects by top developers with Golden Visa eligibility, and find your next investment opportunity.',
    keywords:
        'off-plan projects Dubai, new developments UAE, Golden Visa projects, luxury developments Dubai, DAMAC projects, Emaar projects',
    openGraph: {
        title: 'Off-Plan Projects | MillionFlats',
        description:
            'Discover premium off-plan developments across Dubai and the UAE. Browse luxury projects by top developers.',
        type: 'website',
    },
}

function ProjectsPageFallback({ banner }: { banner: ResolvedHeroBanner }) {
    const heroPresentation = getProjectsHeroPresentation(banner)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Image-only hero */}
            <section
                className={`relative w-full overflow-hidden bg-[#0c1d37] ${heroPresentation.aspectClass} lg:aspect-[1920/450]`}
                aria-label="Projects hero banner"
            >
                <HeroBannerBackdrop
                    desktopImage={banner.desktopImage}
                    mobileImage={banner.mobileImage}
                    desktopAlt={banner.desktopAlt}
                    mobileAlt={banner.mobileAlt}
                    fallbackImage={PROJECTS_HERO_FALLBACK_IMAGE}
                    className={heroPresentation.imageClass}
                />
            </section>

            {/* Search section skeleton */}
            <section className="bg-white border-b border-gray-100 shadow-sm">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
                    <div className="h-3 w-28 bg-gray-100 rounded mb-2 animate-pulse" />
                    <div className="max-w-2xl h-12 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </section>

            <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                            <div className="aspect-[16/10] bg-gray-100" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 bg-gray-100 rounded w-3/4" />
                                <div className="h-4 bg-gray-100 rounded w-1/2" />
                                <div className="h-10 bg-gray-100 rounded-xl mt-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

export default async function ProjectsPage({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
    const cityValue = searchParams.city || ''
    const countryValue = searchParams.country || ''
    const city = Array.isArray(cityValue) ? cityValue[0] : cityValue
    const country = Array.isArray(countryValue) ? countryValue[0] : countryValue
    const initialBanner = await resolveHeroBanner({ category: 'PROJECTS', city, country })
    return (
        <Suspense fallback={<ProjectsPageFallback banner={initialBanner} />}>
            <ProjectsGridClient initialBanner={initialBanner} />
        </Suspense>
    )
}
