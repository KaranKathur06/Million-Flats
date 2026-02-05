import Link from 'next/link'
import PropertyGallery from '@/components/PropertyGallery'
import ClientLazyMap from '@/components/ClientLazyMap'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function ManualPropertyPreview({ manual }: { manual: any }) {
  const title = safeString(manual?.title) || 'Agent Listing'
  const city = safeString(manual?.city)
  const community = safeString(manual?.community)
  const locationLabel = [community, city].filter(Boolean).join(', ')

  const images: string[] = Array.isArray(manual?.media)
    ? manual.media
        .filter((m: any) => {
          const cat = safeString(m?.category)
          return cat !== 'BROCHURE' && cat !== 'VIDEO'
        })
        .map((m: any) => safeString(m?.url))
        .filter(Boolean)
    : []

  const videoUrl = Array.isArray(manual?.media)
    ? safeString(manual.media.find((m: any) => safeString(m?.category) === 'VIDEO')?.url)
    : ''

  const tour3dUrl = safeString(manual?.tour3dUrl)

  const cover = images[0] || '/image-placeholder.svg'

  const lat = safeNumber(manual?.latitude)
  const lng = safeNumber(manual?.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const agentUser = manual?.agent?.user
  const agentName = safeString(agentUser?.name) || 'Agent'
  const phone = safeString(agentUser?.phone)
  const whatsapp = safeString(manual?.agent?.whatsapp)
  const email = safeString(agentUser?.email)

  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : ''

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent Listing</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">{title}</h1>
            <p className="mt-2 text-gray-600">{locationLabel || 'Location available on request'}</p>
          </div>
          <Link href="/properties" className="text-sm font-semibold text-dark-blue hover:underline">
            Back to listings
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <PropertyGallery images={images.length ? images : [cover]} title={title} />
            </div>

            {videoUrl ? (
              <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden">
                <video src={videoUrl} controls className="w-full h-auto bg-black" />
              </div>
            ) : null}

            {tour3dUrl ? (
              <div className="mt-6">
                <a
                  href={tour3dUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                >
                  View 3D Tour
                </a>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-gray-200 p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  Agent Listing
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                  {safeString(manual?.propertyType) || 'Property'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                  {safeString(manual?.intent) === 'RENT' ? 'Rent' : 'Sale'}
                </span>
                {manual?.exclusiveDeal ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-yellow text-dark-blue border border-accent-yellow">
                    Exclusive
                  </span>
                ) : null}
              </div>

              <p className="mt-6 text-lg font-semibold text-dark-blue">Overview</p>
              <p className="mt-3 text-gray-700 leading-relaxed">{safeString(manual?.shortDescription) || ''}</p>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-600">Price</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">
                    {typeof manual?.price === 'number' && manual.price > 0
                      ? `${safeString(manual?.currency) || 'AED'} ${Math.round(manual.price).toLocaleString()}`
                      : 'On request'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-600">Beds</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">{safeNumber(manual?.bedrooms)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-600">Baths</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">{safeNumber(manual?.bathrooms)}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs text-gray-600">Size</p>
                  <p className="mt-2 text-sm font-semibold text-dark-blue">
                    {Math.round(safeNumber(manual?.squareFeet)).toLocaleString()} Sq Ft
                  </p>
                </div>
              </div>

              {(manual?.amenities && Array.isArray(manual.amenities) && manual.amenities.length > 0) ||
              (manual?.customAmenities && Array.isArray(manual.customAmenities) && manual.customAmenities.length > 0) ? (
                <div className="mt-8">
                  <p className="text-lg font-semibold text-dark-blue">Amenities</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(Array.isArray(manual?.amenities) ? manual.amenities : []).map((a: any) => (
                      <span
                        key={String(a)}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200"
                      >
                        {String(a)}
                      </span>
                    ))}
                    {(Array.isArray(manual?.customAmenities) ? manual.customAmenities : []).map((a: any) => (
                      <span
                        key={`c-${String(a)}`}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-dark-blue border border-gray-200"
                      >
                        {String(a)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {hasCoords ? (
                <div className="mt-10">
                  <p className="text-lg font-semibold text-dark-blue">Location</p>
                  <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200">
                    <ClientLazyMap lat={lat} lng={lng} />
                  </div>
                </div>
              ) : null}

              <p className="mt-8 text-xs text-gray-500 leading-relaxed">
                This is an agent-listed property. It is presented separately from verified project inventory.
              </p>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-gray-200 p-7">
              <p className="text-lg font-semibold text-dark-blue">Contact</p>
              <p className="mt-1 text-sm text-gray-600">Listed by {agentName}</p>

              <div className="mt-5 space-y-2">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
                  >
                    Call
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                  >
                    WhatsApp
                  </a>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                  >
                    Email
                  </a>
                ) : null}
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-dark-blue">Trust note</p>
                <p className="mt-2 text-sm text-gray-700">
                  Manual listings are reviewed before approval. Verified project inventory remains immutable.
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href={`/agents/${encodeURIComponent(String(manual?.agentId || ''))}`}
                  className="text-sm font-semibold text-dark-blue hover:underline"
                >
                  View agent profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
