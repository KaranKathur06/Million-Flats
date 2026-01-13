import Link from 'next/link'
import Image from 'next/image'
import { formatCountryPrice } from '@/lib/country'
import { resolvePropertyImages } from '@/lib/propertyImages'

interface Property {
  id: string
  country: 'UAE' | 'India'
  title: string
  location: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  images: string[]
  featured: boolean
  propertyType?: string
}

export default function PropertyCard({ property }: { property: Property }) {
  const images = resolvePropertyImages({
    propertyType: property.propertyType || 'Apartment',
    images: property.images,
    seed: property.id,
  })

  const mainImage = images[0] || '/image-placeholder.svg'
  const unoptimized = mainImage.startsWith('http')

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
      <div className="relative h-64 group">
        <Image
          src={mainImage}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={unoptimized}
        />
        {property.featured && (
          <div className="absolute top-4 right-4 bg-accent-yellow text-dark-blue px-3 py-1 rounded-full text-xs font-semibold">
            Featured
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-dark-blue leading-snug">{property.title}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {property.location}, {property.country}
        </p>

        <p className="text-2xl font-bold text-dark-blue mt-4">
          {formatCountryPrice(property.country, property.price)}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>{property.bedrooms} Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span>{property.bathrooms} Baths</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{property.squareFeet.toLocaleString()} Sq Ft</span>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href={`/properties/${property.id}`}
            className="block w-full text-center bg-dark-blue text-white py-2.5 rounded-xl font-semibold hover:bg-dark-blue/90 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
