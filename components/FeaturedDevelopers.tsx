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
  countryCode: 'UAE' | 'INDIA'
}

export default function FeaturedDevelopers({ market }: { market: CountryCode }) {
  const [items, setItems] = useState<FeaturedDeveloperItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFade(true)

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
        if (cancelled) return
        setLoading(false)
        window.setTimeout(() => {
          if (!cancelled) setFade(false)
        }, 50)
      })

    return () => {
      cancelled = true
    }
  }, [market])

  return (
    <section className="section-spacing bg-gray-50">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">BUILT BY THE BEST</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Developers</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Premium developers joining shortly.</p>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity duration-150 ${fade ? 'opacity-60' : 'opacity-100'}`}
        >
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-black/[0.06] bg-white px-6 py-8 shadow-sm flex flex-col h-full">
                  <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
                  <div className="mt-3 h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                  <div className="mt-auto pt-6">
                    <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                </div>
              ))
            : items.map((d) => (
                <Link
                  key={d.id}
                  href={d.slug ? `/developers/${d.slug}` : '#'}
                  className={`rounded-2xl border border-black/[0.06] bg-white px-6 py-8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full ${d.slug ? 'cursor-pointer' : 'pointer-events-none opacity-70'}`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-black/[0.06]">
                    {d.logo ? (
                      <Image
                        src={d.logo}
                        alt={d.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                        sizes="56px"
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">{d.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-dark-blue">{d.name}</p>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {d.shortDescription || 'Verified inventory source'}
                  </p>
                  <div className="mt-auto pt-5 inline-flex h-10 items-center justify-center rounded-xl bg-dark-blue text-white px-4 text-sm font-semibold">
                    {d.slug ? 'View Developer' : 'Profile Unavailable'}
                  </div>
                </Link>
              ))}
        </div>

        {!loading && items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-sm text-gray-600">No featured developers yet for this market.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
