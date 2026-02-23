'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type ApiResponse = { items?: any[] }

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

export default function FeaturedLocations() {
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/properties', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (cancelled) return
        setProjects(Array.isArray(data?.items) ? data.items : [])
      })
      .catch(() => {
        if (cancelled) return
        setProjects([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const locations = useMemo(() => {
    const map = new Map<string, { region: string; community: string; count: number }>()
    for (const p of projects) {
      const region = safeString(p?.location?.region)
      const community = safeString(p?.location?.district)
      if (!region || !community) continue
      const key = `${normalize(region)}__${normalize(community)}`
      const prev = map.get(key)
      if (prev) prev.count += 1
      else map.set(key, { region, community, count: 1 })
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [projects])

  return (
    <section className="section-spacing bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">MARKETS</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Locations</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore real estate opportunities across regions and communities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((loc) => (
            <Link
              key={`${loc.region}-${loc.community}`}
              href={`/properties?region=${encodeURIComponent(loc.region)}&community=${encodeURIComponent(loc.community)}`}
              className="relative h-64 rounded-lg overflow-hidden group"
            >
              <Image
                src="/image-placeholder.svg"
                alt={`${loc.community}, ${loc.region}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">{loc.community}</h3>
                <p className="text-white/90">
                  {loc.region} • {loc.count} projects
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}