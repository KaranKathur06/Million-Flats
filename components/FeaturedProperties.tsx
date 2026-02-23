'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCountryPrice, type CountryCode } from '@/lib/country'
import { buildProjectSeoPath, buildPropertySlugPath } from '@/lib/seo'

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

export default function FeaturedProperties({ market }: { market: CountryCode }) {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFade(true)

    const params = new URLSearchParams()
    params.set('country', market)
    params.set('limit', '4')
    fetch(`/api/featured/properties?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items
          .map((item: any) => {
            const id = String(item?.id ?? '')
            if (!id) return null

            const city = String(item?.city ?? '')
            const community = String(item?.community ?? '')
            const location = [city, community].filter(Boolean).join(' · ')

            const images: string[] = Array.isArray(item?.images) ? item.images : []
            const coverImage = String(images?.[0] || '')

            const price = Number(item?.price ?? 0)
            const displayPrice = Number.isFinite(price) ? price : 0

            return {
              id,
              title: String(item?.title ?? 'Property'),
              developer: String(item?.developerName ?? ''),
              location,
              city,
              community,
              price: displayPrice,
              priceOnRequest: displayPrice <= 0,
              coverImage,
            }
          })
          .filter(Boolean)

        setProperties(mapped)
      })
      .catch((err) => {
        if (!cancelled) console.error('Error fetching featured properties:', err)
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
            CURATED SELECTION
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Handpicked luxury properties representing the finest real estate across global markets.
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${fade ? 'opacity-60' : 'opacity-100'}`}>
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md">
                  <div className="relative aspect-[4/3] bg-gray-100 animate-pulse" />
                  <div className="p-6">
                    <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse" />
                    <div className="mt-3 h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                    <div className="mt-6 h-6 w-1/2 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))
            : properties.map((property: any) => {
            const mainImage = property.coverImage || '/image-placeholder.svg'
            const unoptimized = mainImage.startsWith('http') && !canOptimizeUrl(mainImage)

            const canonicalHref = buildPropertySlugPath({
              id: String(property.id),
              title: String(property.title || ''),
            })

            const href =
              canonicalHref ||
              buildProjectSeoPath({
                id: Number(property.id),
                name: String(property.title || ''),
                region: String(property.city || ''),
                district: String(property.community || ''),
                sector: '',
              }) || `/properties/${property.id}`

            return (
              <Link
                key={property.id}
                href={href}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                  <Image
                    src={mainImage}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    unoptimized={unoptimized}
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-dark-blue mb-2">{property.title}</h3>
                  {property.developer ? <p className="text-sm text-gray-600 mb-1">{property.developer}</p> : null}
                  <p className="text-gray-600 mb-4">{property.location}</p>
                  <p className="text-2xl font-bold text-dark-blue">
                    {property.priceOnRequest ? 'Price on request' : `From ${formatCountryPrice(market, property.price)}`}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/buy"
            className="inline-block bg-dark-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Explore All Properties
          </Link>
        </div>
      </div>
    </section>
  )
}

