'use client'

import Image from 'next/image'
import Link from 'next/link'
import CurrencyPrice from '@/components/CurrencyPrice'
import { buildPropertySlugPath } from '@/lib/seo'

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    return new URL(src).hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

type PropertyDiscoveryCardProps = {
  property: {
    id: string
    title: string
    price: number
    currency?: string
    country: 'UAE' | 'INDIA'
    city?: string
    community?: string
    location: string
    propertyType: string
    bedrooms: number
    bathrooms: number
    squareFeet: number
    images: string[]
    featured: boolean
    href?: string
    intent?: 'BUY' | 'RENT'
  }
}

export default function PropertyDiscoveryCard({ property }: PropertyDiscoveryCardProps) {
  const image = property.images[0] || '/image-placeholder.svg'
  const href = property.href || buildPropertySlugPath({ id: property.id, title: property.title }) || `/properties/${property.id}`
  const sourceCurrency = property.currency === 'INR' || property.country === 'INDIA' ? 'INR' : 'AED'
  const location = [property.community, property.city].filter(Boolean).join(' · ') || property.location || property.country
  const unoptimized = image.startsWith('http') && !canOptimizeUrl(image)

  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={href} className="block" aria-label={`View ${property.title}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          <Image
            src={image}
            alt={property.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={unoptimized}
            loading="lazy"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {property.featured ? <span className="rounded-full bg-accent-yellow px-3 py-1 text-xs font-semibold text-dark-blue">Featured</span> : <span />}
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-dark-blue">{property.intent === 'RENT' ? 'For Rent' : 'For Sale'}</span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xl font-bold leading-tight text-dark-blue">
            <CurrencyPrice amount={property.price} sourceCurrency={sourceCurrency} />
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-tight text-dark-blue">{property.title}</h3>
          <p className="mt-2 truncate text-sm text-gray-600">{location}</p>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
            <span>{property.bedrooms} Beds</span>
            <span aria-hidden="true">·</span>
            <span>{property.bathrooms} Baths</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round(property.squareFeet).toLocaleString()} Sq Ft</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{property.propertyType}</span>
            <span className="text-sm font-semibold text-dark-blue">View Property <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </Link>
    </article>
  )
}
