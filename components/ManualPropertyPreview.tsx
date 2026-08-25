import Link from 'next/link'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
import PropertyListCard from '@/components/PropertyListCard'
import ClientLazyMap from '@/components/ClientLazyMap'
import AmenitiesListModal from '@/components/AmenitiesListModal'
import { buildAssetUrl } from '@/lib/assetUrl'
import CurrencyPrice from '@/components/CurrencyPrice'
import { buildManualPropertyPath } from '@/lib/manualPropertyRoutes'
import { PROPERTY_MEDIA_CATEGORIES, propertyMediaCategory, type PropertyMediaCategory } from '@/lib/propertyMedia'
import { orderManualPropertyMedia } from '@/lib/manualPropertyForm'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function mapRelatedProperty(property: any) {
  const media = Array.isArray(property?.media) ? property.media : []
  const country = property?.countryCode === 'INDIA' ? 'INDIA' : 'UAE'
  return {
    id: String(property?.id || ''),
    href: buildManualPropertyPath({ id: property?.id, title: property?.title, intent: property?.intent }),
    country,
    title: safeString(property?.title) || 'Agent Listing',
    location: [safeString(property?.city), safeString(property?.community)].filter(Boolean).join(', '),
    price: safeNumber(property?.price),
    currency: safeString(property?.currency) || (country === 'INDIA' ? 'INR' : 'AED'),
    bedrooms: safeNumber(property?.bedrooms),
    bathrooms: safeNumber(property?.bathrooms),
    squareFeet: safeNumber(property?.squareFeet),
    images: media.map((m: any) => buildAssetUrl(safeString(m?.s3Key) || safeString(m?.url)) || safeString(m?.url)).filter(Boolean),
    featured: Boolean(property?.exclusiveDeal),
    propertyType: safeString(property?.propertyType) || 'Property',
    agent: property?.agent?.user
      ? {
          id: safeString(property?.agentId),
          name: safeString(property.agent.user?.name),
          email: safeString(property.agent.user?.email),
          phone: safeString(property.agent.user?.phone),
          avatar: safeString(property.agent.user?.image),
        }
      : undefined,
  }
}

export default function ManualPropertyPreview({ manual, related = [] }: { manual: any; related?: any[] }) {
  const title = safeString(manual?.title) || 'Agent Listing'
  const city = safeString(manual?.city)
  const community = safeString(manual?.community)
  const locationLabel = [community, city].filter(Boolean).join(', ')

  const priceLabel =
    typeof manual?.price === 'number' && manual.price > 0
      ? <CurrencyPrice amount={manual.price} sourceCurrency={safeString(manual?.currency) === 'INR' ? 'INR' : 'AED'} />
      : 'Price on request'

  const mediaItems = Array.isArray(manual?.media)
    ? orderManualPropertyMedia(manual.media
        .filter((m: any) => {
          const cat = safeString(m?.category)
          return cat !== 'BROCHURE' && cat !== 'VIDEO'
        })
        .map((m: any) => ({
          category: propertyMediaCategory(safeString(m?.category)),
          url: buildAssetUrl(safeString(m?.s3Key) || safeString(m?.url)) || safeString(m?.url),
          position: safeNumber(m?.position),
        }))
        .filter((m: any) => Boolean(m.url)))
    : []

  const images: string[] = mediaItems.map((m: any) => m.url)
  const mediaByCategory = PROPERTY_MEDIA_CATEGORIES.reduce((acc, category) => {
    const categoryImages = mediaItems.filter((m: any) => m.category === category).map((m: any) => m.url)
    if (categoryImages.length) acc[category] = categoryImages
    return acc
  }, {} as Record<PropertyMediaCategory, string[]>)

  const cover = images[0] || '/image-placeholder.svg'
  const lat = safeNumber(manual?.latitude)
  const lng = safeNumber(manual?.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const agentUser = manual?.agent?.user
  const agentName = safeString(agentUser?.name) || 'Agent'
  const phone = safeString(agentUser?.phone)
  const whatsapp = safeString(manual?.agent?.whatsapp)
  const email = safeString(agentUser?.email)
  const avatarUrl = safeString(agentUser?.image) || safeString(agentUser?.avatar) || ''
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : ''

  const amenityNames = [
    ...(Array.isArray(manual?.amenities) ? manual.amenities : []),
    ...(Array.isArray(manual?.customAmenities) ? manual.customAmenities : []),
  ]
    .map((a: any) => (typeof a === 'string' ? a : String(a)))
    .map((s) => s.trim())
    .filter(Boolean)

  const relatedProperties = (Array.isArray(related) ? related : []).slice(0, 3).map(mapRelatedProperty).filter((p) => p.id)
  const canonicalPath = buildManualPropertyPath({ id: manual?.id, title, intent: manual?.intent })
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: title,
    url: canonicalPath,
    description: safeString(manual?.shortDescription) || undefined,
    image: images.length > 0 ? images.slice(0, 20) : undefined,
    offers:
      typeof manual?.price === 'number' && manual.price > 0
        ? {
            '@type': 'Offer',
            price: String(manual.price),
            priceCurrency: safeString(manual?.currency) || undefined,
          }
        : undefined,
    geo: hasCoords ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } : undefined,
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="relative h-[60vh] max-h-[70vh] overflow-hidden">
        <Image src={cover} alt={title} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        <div className="absolute inset-0">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8">
            <div className="w-full flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[900px]">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-white tracking-tight">{title}</h1>
                <p className="mt-2 text-white/85 text-sm sm:text-base">{locationLabel || 'Location available on request'}</p>
                <p className="mt-4 text-2xl sm:text-3xl font-semibold text-white">{priceLabel}</p>
              </div>
              <a
                href={whatsappHref || (phone ? `tel:${phone}` : email ? `mailto:${email}` : '/contact')}
                target={whatsappHref ? '_blank' : undefined}
                rel={whatsappHref ? 'noreferrer' : undefined}
                className="inline-flex h-12 px-6 rounded-xl bg-white text-dark-blue font-semibold items-center justify-center shadow-sm hover:bg-white/95"
              >
                Contact Agent
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pb-14">
        <div className="space-y-12 pt-10">
          {safeString(manual?.shortDescription) ? (
            <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Description</h2>
              <div className="mt-4 max-w-[820px]">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{safeString(manual?.shortDescription)}</p>
              </div>
            </section>
          ) : null}

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Facts</h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-dark-blue tracking-tight">{safeNumber(manual?.bedrooms) || '-'}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">Beds</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-dark-blue tracking-tight">{safeNumber(manual?.bathrooms) || '-'}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">Baths</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-dark-blue tracking-tight">
                  {manual?.squareFeet ? `${Math.round(safeNumber(manual?.squareFeet)).toLocaleString()} sq ft` : '-'}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">Area</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-dark-blue tracking-tight">{priceLabel}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-gray-500">Price</div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {manual?.furnishingStatus ? <span>Furnishing: <strong className="text-dark-blue">{String(manual.furnishingStatus).replace(/_/g, ' ')}</strong></span> : null}
              {manual?.parkingSpaces != null ? <span>Parking: <strong className="text-dark-blue">{manual.parkingSpaces}</strong></span> : null}
              {manual?.balconyCount != null ? <span>Balconies: <strong className="text-dark-blue">{manual.balconyCount}</strong></span> : null}
              {manual?.floorNumber != null ? <span>Floor: <strong className="text-dark-blue">{manual.floorNumber}{manual?.totalFloors != null ? ` / ${manual.totalFloors}` : ''}</strong></span> : null}
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Gallery / Media</h2>
              {images.length > 0 ? <p className="text-xs uppercase tracking-widest text-gray-500">{images.length} photos</p> : null}
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl">
              <PropertyGallery images={images.length ? images : [cover]} title={title} heightClassName="relative h-[320px] sm:h-[420px] md:h-[520px]" />
            </div>
            {Object.keys(mediaByCategory).length > 1 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {PROPERTY_MEDIA_CATEGORIES.filter((category) => category !== 'COVER' && mediaByCategory[category]?.length).map((category) => (
                  <div key={category} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{category.replace('_', ' ')}</h3>
                      <span className="text-xs text-gray-400">{mediaByCategory[category].length}</span>
                    </div>
                    <PropertyGallery images={mediaByCategory[category]} title={`${title} ${category}`} heightClassName="relative h-[180px] sm:h-[220px]" />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {amenityNames.length > 0 ? (
            <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Amenities</h2>
              <div className="mt-5">
                <AmenitiesListModal amenities={amenityNames} maxPreview={8} title="Amenities" />
              </div>
            </section>
          ) : null}

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Location</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="order-2 md:order-1">
                <p className="text-sm text-gray-700">{locationLabel || 'Location available on request'}</p>
                {safeString(manual?.address) ? <p className="mt-2 text-sm text-gray-600">{safeString(manual?.address)}</p> : null}
                <p className="mt-3 text-xs text-gray-500">Agent listing</p>
                {hasCoords ? (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-dark-blue hover:underline"
                  >
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
              <div className="order-1 md:order-2">
                {hasCoords ? (
                  <div className="overflow-hidden rounded-2xl bg-gray-50">
                    <ClientLazyMap lat={lat} lng={lng} className="h-[200px] md:h-[240px]" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Map coordinates are not available for this listing yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Agent</h2>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                  {avatarUrl ? <Image src={avatarUrl} alt={agentName} fill className="object-cover" sizes="48px" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark-blue truncate">{agentName}</p>
                  <p className="text-xs text-gray-600">Listing Agent</p>
                </div>
              </div>
              <a
                href={whatsappHref || (phone ? `tel:${phone}` : email ? `mailto:${email}` : '/contact')}
                target={whatsappHref ? '_blank' : undefined}
                rel={whatsappHref ? 'noreferrer' : undefined}
                className="inline-flex h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold items-center justify-center shadow-sm"
              >
                Contact
              </a>
            </div>
            <div className="mt-6">
              <Link href={`/agents/${encodeURIComponent(String(manual?.agentId || ''))}`} className="text-sm font-semibold text-dark-blue hover:underline">
                View agent profile
              </Link>
            </div>
          </section>

          {relatedProperties.length > 0 ? (
            <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Related Properties</h2>
                  <p className="mt-1 text-sm text-gray-600">More published listings in {city}.</p>
                </div>
                <Link href={manual?.intent === 'RENT' ? '/rent' : '/buy'} className="text-sm font-semibold text-dark-blue hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {relatedProperties.map((property) => (
                  <PropertyListCard key={property.id} property={property as any} variant="compact" />
                ))}
              </div>
            </section>
          ) : null}

          <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-dark-blue">Contact</h2>
            <p className="mt-2 text-sm text-gray-600">Speak to an agent for availability, pricing, and viewing.</p>
            <div className="mt-5">
              <Link href="/contact" className="h-12 px-6 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center">
                Contact Agent
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
