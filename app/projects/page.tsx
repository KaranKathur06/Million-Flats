import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProjectsGridClient from './ProjectsGridClient'

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

function ProjectsPageFallback() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="relative overflow-hidden bg-gradient-to-br from-[#0c1d37] via-[#162d50] to-[#1e3a5f] pt-8 pb-12 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="h-8 w-48 bg-white/10 rounded-full mx-auto mb-5 animate-pulse" />
                    <div className="h-14 w-96 bg-white/10 rounded-xl mx-auto mb-5 animate-pulse" />
                    <div className="h-5 w-80 bg-white/10 rounded-lg mx-auto animate-pulse" />
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

export default function ProjectsPage() {
    return (
        <Suspense fallback={<ProjectsPageFallback />}>
            <ProjectsGridClient />
        </Suspense>
    )
}
