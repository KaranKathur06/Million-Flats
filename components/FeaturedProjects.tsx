'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCountryPrice, type CountryCode } from '@/lib/country'

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface ProjectItem {
    id: string
    name: string
    slug: string
    city: string | null
    community: string | null
    startingPrice: number | null
    coverImage: string | null
    developer: { id: string; name: string } | null
}

function canOptimizeUrl(src: string) {
    if (!src.startsWith('http')) return true
    try {
        const u = new URL(src)
        return u.hostname === 'images.unsplash.com'
    } catch {
        return false
    }
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function FeaturedProjects({ market }: { market: CountryCode }) {
    const [projects, setProjects] = useState<ProjectItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        async function fetchRandomProjects() {
            try {
                const res = await fetch('/api/projects?featured=true&limit=8', { cache: 'no-store' })
                if (!res.ok) throw new Error('Failed to fetch projects')
                const data = await res.json()

                if (data.success && data.items && isMounted) {
                    setProjects((data.items || []).slice(0, 4))
                }
            } catch (error) {
                console.error('Error fetching random projects:', error)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchRandomProjects()

        return () => {
            isMounted = false
        }
    }, [])

    if (!loading && projects.length === 0) return null

    return (
        <section className="section-spacing bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* ── Section header ── */}
                <div className="text-center mb-16">
                    <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
                        SIGNATURE DEVELOPMENTS
                    </p>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">
                        Featured Projects
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Carefully selected landmark developments in this market.
                    </p>
                </div>

                {/* ── Card grid — 1 / 2 / 4 columns ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        /* Skeleton loader */
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                                <div className="aspect-[16/9] bg-gray-100" />
                                <div className="p-6 space-y-3">
                                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                                    <div className="h-10 bg-gray-100 rounded-xl mt-4" />
                                </div>
                            </div>
                        ))
                    ) : (
                        projects.map((project) => {
                            const img = project.coverImage || '/images/default-property.jpg'
                            const unoptimized = img.startsWith('http') && !canOptimizeUrl(img)

                            const location = [project.community, project.city].filter(Boolean).join(' • ')
                            const developerName = project.developer?.name || 'Developer'

                            return (
                                <div
                                    key={project.id}
                                    className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
                                >
                                    {/* Gold accent line at top */}
                                    <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-orange via-accent-yellow to-accent-orange opacity-80" />

                                    {/* Hero image — 16 : 9 */}
                                    <div className="relative aspect-[16/9] overflow-hidden">
                                        {img ? (
                                            <Image
                                                src={img}
                                                alt={project.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                unoptimized={unoptimized}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                                <span className="text-gray-400">No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card body */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-[1.15rem] leading-snug font-bold text-dark-blue mb-1 line-clamp-2">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-1">{developerName}</p>
                                        <p className="text-sm text-gray-600 mb-4">{location}</p>

                                        {/* Price */}
                                        <div className="mt-auto">
                                            <p className="text-xl font-bold text-dark-blue">
                                                {project.startingPrice && project.startingPrice > 0
                                                    ? `From ${formatCountryPrice(market, project.startingPrice)}`
                                                    : 'Price on request'}
                                            </p>
                                        </div>

                                        {/* CTA */}
                                        <Link
                                            href={`/projects/${project.slug}`}
                                            className="mt-4 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90 transition-colors"
                                        >
                                            View Project
                                        </Link>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* "View All Projects" CTA */}
                <div className="text-center mt-12">
                    <Link
                        href="/projects"
                        className="inline-block bg-dark-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors cursor-pointer"
                    >
                        View All Projects
                    </Link>
                </div>
            </div>
        </section>
    )
}
