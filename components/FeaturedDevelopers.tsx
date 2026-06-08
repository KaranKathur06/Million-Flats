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
                className={`group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${
                  d.slug ? 'cursor-pointer' : 'pointer-events-none opacity-70'
                }`}
              >
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent-orange via-accent-yellow to-accent-orange opacity-80 group-hover:opacity-100 transition-opacity z-10" />

                <div className="relative aspect-[16/9] overflow-hidden bg-slate-50">
                  <Image
                    src={d.banner || d.logo || FALLBACK_IMAGE}
                    alt={d.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  <div className="absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-xl bg-black/40 backdrop-blur-md px-3 py-2 border border-white/10 shadow-lg">
                    <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-white">
                      {d.logo ? (
                        <Image src={d.logo} alt="" fill className="object-contain p-1" sizes="32px" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[12px] font-bold text-dark-blue">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-white tracking-wide uppercase pr-1">Featured</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 bg-white">
                  <h3 className="text-[1.1rem] leading-snug font-bold text-dark-blue line-clamp-2 min-h-[2.75rem]">{d.name}</h3>
                  <p className="mt-2.5 text-[0.875rem] leading-relaxed text-gray-500 line-clamp-2 min-h-[2.75rem]">
                    {d.shortDescription || 'Verified inventory source with premium project pipeline.'}
                  </p>

                  <div className="mt-auto pt-6 w-full">
                    <div className="w-full flex items-center justify-center h-12 rounded-xl bg-dark-blue group-hover:bg-[#0B1838] shadow-[0_2px_10px_rgba(11,32,70,0.15)] group-hover:shadow-[0_6px_20px_rgba(11,32,70,0.25)] transition-all duration-300 text-white text-[14px] font-semibold tracking-wide">
                      {d.slug ? 'View Developer' : 'Profile Unavailable'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </section>
  )
}
