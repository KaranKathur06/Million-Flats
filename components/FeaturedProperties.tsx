'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCountry } from '@/components/CountryProvider'
import { formatCountryPrice } from '@/lib/country'
import { resolvePropertyImages } from '@/lib/propertyImages'

export default function FeaturedProperties() {
  const [properties, setProperties] = useState<any[]>([])
  const { country } = useCountry()

  useEffect(() => {
    fetch(`/api/properties?featured=true&limit=4&country=${encodeURIComponent(country)}`)
      .then(res => res.json())
      .then(data => setProperties(data))
      .catch(err => console.error('Error fetching properties:', err))
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
            const images = resolvePropertyImages({
              propertyType: property.propertyType || 'Apartment',
              images: property.images,
              seed: property.id,
            })

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className="relative h-64">
                  <Image
                    src={images[0] || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80'}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  {property.featured && (
                    <div className="absolute top-4 right-4 bg-accent-yellow text-dark-blue px-3 py-1 rounded-full text-xs font-semibold">
                      Featured
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-dark-blue mb-2">{property.title}</h3>
                  <p className="text-gray-600 mb-4">{property.location}</p>
                  <p className="text-2xl font-bold text-dark-blue">{formatCountryPrice(country, property.price)}</p>
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

