 'use client'

import { useEffect, useState } from 'react'
import type { CountryCode } from '@/lib/country'

export default function FeaturedDevelopers({ market }: { market: CountryCode }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFade(true)

    const params = new URLSearchParams()
    params.set('country', market)
    params.set('limit', '4')

    fetch(`/api/featured/developers?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const next = Array.isArray(data?.items) ? data.items : []
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
            : items.map((d: any) => (
                <div
                  key={String(d?.id || '')}
                  className="rounded-2xl border border-black/[0.06] bg-white px-6 py-8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
                >
                  <p className="text-sm font-semibold text-dark-blue">{String(d?.name || 'Developer')}</p>
                  <p className="mt-2 text-sm text-gray-600">Verified inventory source</p>
                  <div className="mt-auto pt-5 inline-flex h-10 items-center justify-center rounded-xl bg-dark-blue text-white px-4 text-sm font-semibold">
                    View Developer
                  </div>
                </div>
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
