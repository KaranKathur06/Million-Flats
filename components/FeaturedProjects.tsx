'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCountryPrice, type CountryCode } from '@/lib/country'
import { buildProjectSeoPath } from '@/lib/seo'

/* ─────────────────────────────────────────────
   Curated project data — manual control only.
   Replace / extend entries per market as needed.
   Later: migrate to DB with isFeaturedProject flag.
   ───────────────────────────────────────────── */

interface FeaturedProject {
    id: number
    name: string
    developer: string
    location: string
    region: string
    district: string
    sector: string
    /** Starting price in AED (converted to INR for INDIA market) */
    startingPriceAed: number
    coverImage: string
    market: CountryCode
}

const FEATURED_PROJECTS: FeaturedProject[] = [
    // ── UAE ──
    {
        id: 101,
        name: 'The Royal Atlantis Residences',
        developer: 'Kerzner International',
        location: 'Palm Jumeirah, Dubai',
        region: 'Dubai',
        district: 'Palm Jumeirah',
        sector: 'Residential',
        startingPriceAed: 15_000_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'UAE',
    },
    {
        id: 102,
        name: 'Emaar Beachfront Towers',
        developer: 'Emaar Properties',
        location: 'Dubai Harbour, Dubai',
        region: 'Dubai',
        district: 'Dubai Harbour',
        sector: 'Residential',
        startingPriceAed: 3_500_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'UAE',
    },
    {
        id: 103,
        name: 'DAMAC Lagoons',
        developer: 'DAMAC Properties',
        location: 'Dubailand, Dubai',
        region: 'Dubai',
        district: 'Dubailand',
        sector: 'Residential',
        startingPriceAed: 1_200_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'UAE',
    },
    {
        id: 104,
        name: 'Aldar Saadiyat Reserve',
        developer: 'Aldar Properties',
        location: 'Saadiyat Island, Abu Dhabi',
        region: 'Abu Dhabi',
        district: 'Saadiyat Island',
        sector: 'Residential',
        startingPriceAed: 7_500_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'UAE',
    },

    // ── INDIA ──
    {
        id: 201,
        name: 'Lodha World Towers',
        developer: 'Lodha Group',
        location: 'Lower Parel, Mumbai',
        region: 'Mumbai',
        district: 'Lower Parel',
        sector: 'Residential',
        startingPriceAed: 4_000_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'INDIA',
    },
    {
        id: 202,
        name: 'Prestige Golfshire',
        developer: 'Prestige Group',
        location: 'Nandi Hills, Bangalore',
        region: 'Bangalore',
        district: 'Nandi Hills',
        sector: 'Residential',
        startingPriceAed: 2_200_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'INDIA',
    },
    {
        id: 203,
        name: 'DLF The Camellias',
        developer: 'DLF Limited',
        location: 'Golf Course Road, Gurgaon',
        region: 'Gurgaon',
        district: 'Golf Course Road',
        sector: 'Residential',
        startingPriceAed: 8_000_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'INDIA',
    },
    {
        id: 204,
        name: 'Godrej Platinum',
        developer: 'Godrej Properties',
        location: 'Alipore, Kolkata',
        region: 'Kolkata',
        district: 'Alipore',
        sector: 'Residential',
        startingPriceAed: 1_800_000,
        coverImage: '/HOMEPAGE.jpg',
        market: 'INDIA',
    },
]

/* ───────────── helpers ───────────── */

function canOptimizeUrl(src: string) {
    if (!src.startsWith('http')) return true
    try {
        const u = new URL(src)
        return u.hostname === 'images.unsplash.com'
    } catch {
        return false
    }
}

/* ───────────── component ───────────── */

export default function FeaturedProjects({ market }: { market: CountryCode }) {
    const projects = useMemo(
        () => FEATURED_PROJECTS.filter((p) => p.market === market).slice(0, 4),
        [market],
    )

    if (projects.length === 0) return null

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
                    {projects.map((project) => {
                        const img = project.coverImage || '/image-placeholder.svg'
                        const unoptimized = img.startsWith('http') && !canOptimizeUrl(img)

                        const href =
                            buildProjectSeoPath({
                                id: project.id,
                                name: project.name,
                                region: project.region,
                                district: project.district,
                                sector: project.sector,
                            }) || `/properties/${project.id}`

                        return (
                            <div
                                key={project.id}
                                className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
                            >
                                {/* Gold accent line at top */}
                                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-orange via-accent-yellow to-accent-orange opacity-80" />

                                {/* Hero image — 16 : 9 */}
                                <div className="relative aspect-[16/9] overflow-hidden">
                                    <Image
                                        src={img}
                                        alt={project.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        unoptimized={unoptimized}
                                        loading="lazy"
                                    />
                                </div>

                                {/* Card body */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-[1.15rem] leading-snug font-bold text-dark-blue mb-1 line-clamp-2">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-1">{project.developer}</p>
                                    <p className="text-sm text-gray-600 mb-4">{project.location}</p>

                                    {/* Price */}
                                    <div className="mt-auto">
                                        <p className="text-xl font-bold text-dark-blue">
                                            {project.startingPriceAed > 0
                                                ? `From ${formatCountryPrice(market, project.startingPriceAed)}`
                                                : 'Price on request'}
                                        </p>
                                    </div>

                                    {/* CTA */}
                                    <Link
                                        href={href}
                                        className="mt-4 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90 transition-colors"
                                    >
                                        View Project
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* "View All Projects" CTA */}
                <div className="text-center mt-12">
                    <Link
                        href="/projects"
                        className="inline-block bg-dark-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                    >
                        View All Projects
                    </Link>
                </div>
            </div>
        </section>
    )
}
