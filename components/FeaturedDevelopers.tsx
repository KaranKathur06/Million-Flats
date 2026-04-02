'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CountryCode } from '@/lib/country'

type FeaturedDeveloperItem = {
  id: string
  name: string
  slug: string | null
  logo: string | null
  banner: string | null
  shortDescription: string | null
}

const FALLBACK_IMAGE = '/images/default-property.jpg'

export default function FeaturedDevelopers({ market }: { market: CountryCode }) {
  const [items, setItems] = useState<FeaturedDeveloperItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams()
    params.set('country', market)
    params.set('limit', '4')
    params.set('featured', 'true')

    fetch(`/api/developers?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const next = Array.isArray(data?.data) ? data.data.slice(0, 4) : []
        setItems(next)
      })
      .catch((e) => {
        if (!cancelled) console.error('Featured developers: failed', e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [market])

  if (!loading && items.length === 0) return null

  return (
    <section className="section-spacing bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">BUILT BY THE BEST</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Developers</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Trusted developers powering premium off-plan inventory.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-gray-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-10 bg-gray-100 rounded-xl mt-4" />
                </div>
              </div>
            ))
            : items.map((d) => (
              <Link
                key={d.id}
                href={d.slug ? `/developers/${d.slug}` : '#'}
                className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full ${d.slug ? 'cursor-pointer' : 'pointer-events-none opacity-70'}`}
              >
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-orange via-accent-yellow to-accent-orange opacity-80" />

                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                  <Image
                    src={d.banner || d.logo || FALLBACK_IMAGE}
                    alt={d.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl bg-black/50 backdrop-blur-md px-2.5 py-1.5">
                    <div className="relative h-7 w-7 overflow-hidden rounded-md bg-white/90">
                      {d.logo ? (
                        <Image src={d.logo} alt="" fill className="object-contain" sizes="28px" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[11px] font-bold text-dark-blue">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white">Featured Developer</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-[1.05rem] leading-snug font-bold text-dark-blue line-clamp-2">{d.name}</h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {d.shortDescription || 'Verified inventory source with premium project pipeline.'}
                  </p>

                  <div className="mt-auto pt-5 inline-flex items-center justify-center h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold">
                    {d.slug ? 'View Developer' : 'Profile Unavailable'}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </section>
  )
}
