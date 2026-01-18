'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCountry } from '@/components/CountryProvider'
import { formatCountryPrice } from '@/lib/country'
import { buildProjectSeoPath } from '@/lib/seo'

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<any[]>([])
  const { country } = useCountry()

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('country', country === 'India' ? 'India' : 'UAE')
    params.set('limit', '4')
    fetch(`/api/properties?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items
          .map((item: any) => {
            const id = String(item?.id ?? '')
            if (!id) return null

            const region = String(item?.location?.region ?? '')
            const district = String(item?.location?.district ?? '')
            const sector = String(item?.location?.sector ?? '')
            const location = [district, region].filter(Boolean).join(', ')

            const minPrice = Number(item?.min_price ?? 0)
            const displayPrice = Number.isFinite(minPrice) ? minPrice : 0

            return {
              id,
              title: String(item?.name ?? 'Project'),
              developer: String(item?.developer ?? ''),
              location,
              region,
              district,
              sector,
              price: displayPrice,
              priceOnRequest: displayPrice <= 0,
              coverImage: String(item?.cover_image?.url ?? ''),
            }
          })
          .filter(Boolean)
        setProperties(mapped)
      })
      .catch((err) => console.error('Error fetching properties:', err))
  }, [country])

  return (
    <section className="py-20 bg-gray-50">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property: any) => {
            const mainImage = property.coverImage || '/image-placeholder.svg'
            const unoptimized = mainImage.startsWith('http') && !canOptimizeUrl(mainImage)

            const href =
              buildProjectSeoPath({
                id: Number(property.id),
                name: String(property.title || ''),
                region: String(property.region || ''),
                district: String(property.district || ''),
                sector: String(property.sector || ''),
              }) || `/properties/${property.id}`

            return (
              <Link
                key={property.id}
                href={href}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className="relative h-64">
                  <Image
                    src={mainImage}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    unoptimized={unoptimized}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-dark-blue mb-2">{property.title}</h3>
                  {property.developer ? <p className="text-sm text-gray-600 mb-1">{property.developer}</p> : null}
                  <p className="text-gray-600 mb-4">{property.location}</p>
                  <p className="text-2xl font-bold text-dark-blue">
                    {property.priceOnRequest ? 'Price on request' : `From ${formatCountryPrice(country, property.price)}`}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/properties"
            className="inline-block bg-dark-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Explore All Properties
          </Link>
        </div>
      </div>
    </section>
  )
}

