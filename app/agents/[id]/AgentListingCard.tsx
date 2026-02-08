import Link from 'next/link'
import Image from 'next/image'
import { formatCountryPrice } from '@/lib/country'
import { resolvePropertyImages } from '@/lib/propertyImages'
import { buildPropertySlugPath } from '@/lib/seo'

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

type Listing = {
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

export default function AgentListingCard({ listing }: { listing: Listing }) {
  const href = buildPropertySlugPath({ id: listing.id, title: listing.title }) || `/properties/${encodeURIComponent(listing.id)}`

  const images = resolvePropertyImages({
    propertyType: listing.propertyType || 'Property',
    images: listing.images,
    seed: listing.id,
  })

  const mainImage = images[0] || '/image-placeholder.svg'
  const unoptimized = mainImage.startsWith('http') && !canOptimizeUrl(mainImage)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors">
      <div className="relative aspect-[16/10] bg-gray-100">
        <Image
          src={mainImage}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={unoptimized}
        />
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-dark-blue border border-white/60">
          Agent listing
        </div>
        {listing.featured ? (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-dark-blue border border-white/60">
            Featured
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <p className="text-lg font-bold text-dark-blue">{formatCountryPrice(listing.country, listing.price)}</p>
        <Link href={href} className="block mt-2">
          <h3 className="text-base font-semibold text-dark-blue leading-snug hover:underline">
            {listing.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-600 mt-1">{listing.location}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            {listing.bedrooms} Beds
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            {listing.bathrooms} Baths
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            {listing.squareFeet.toLocaleString()} Sq Ft
          </span>
        </div>

        <div className="mt-5">
          <Link
            href={href}
            className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 transition-colors"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  )
}
