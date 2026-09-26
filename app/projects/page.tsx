import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProjectsGridClient from './ProjectsGridClient'
import { resolveHeroBanner } from '@/lib/heroBanners'
import HeroBannerBackdrop from '@/components/HeroBannerBackdrop'
import type { ResolvedHeroBanner } from '@/lib/heroBanners'

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
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1d37] via-[#162d50] to-[#1e3a5f] pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16">
                <HeroBannerBackdrop desktopImage={banner.desktopImage} mobileImage={banner.mobileImage} desktopAlt={banner.desktopAlt} mobileAlt={banner.mobileAlt} className="h-full w-full object-cover opacity-25" />
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <span className="inline-flex items-center rounded-full bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">Off-Plan Developments</span>
                    <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">{banner.headline}</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{banner.subheadline}</p>
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
