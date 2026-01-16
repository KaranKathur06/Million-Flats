import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
import LazyMap from '@/components/LazyMap'
import { reellyFetch } from '@/lib/reelly'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(v: string) {
  return v.trim().toLowerCase()
}

function formatAed(amount: number) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount)
}

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [] as unknown[], raw }

  const anyRaw = raw as any
  const items =
    Array.isArray(anyRaw.items)
      ? anyRaw.items
      : Array.isArray(anyRaw.results)
        ? anyRaw.results
        : Array.isArray(anyRaw.data)
          ? anyRaw.data
          : Array.isArray(anyRaw)
            ? anyRaw
            : []

  return { items, raw }
}

function toImageUrl(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const u = (v as any).url
    if (typeof u === 'string') return u
  }
  return ''
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const rawId = safeString(params?.id)
  if (!rawId) notFound()

  let item: any
  let marker: any = null
  let developerRecord: any = null

  try {
    item = await reellyFetch<any>(`/api/v2/clients/projects/${encodeURIComponent(rawId)}`, {}, { cacheTtlMs: 0 })
  } catch {
    notFound()
  }

  if (!item || typeof item !== 'object') notFound()

  try {
    const markersRaw = await reellyFetch<any>('/api/v2/clients/projects/markers', {}, { cacheTtlMs: 0 })
    const markers = normalizeListResponse(markersRaw).items
    const projectId = safeString(item?.id) || String(safeNumber(item?.id))
    marker =
      markers.find((m: any) => String(m?.project_id ?? m?.projectId ?? m?.id) === String(projectId)) ||
      markers.find((m: any) => String(m?.id) === String(projectId)) ||
      null
  } catch {
    marker = null
  }

  try {
    const developersRaw = await reellyFetch<any>('/api/v2/clients/developers', {}, { cacheTtlMs: 0 })
    const developers = normalizeListResponse(developersRaw).items
    const developerId = safeString(item?.developer_id) || String(safeNumber(item?.developer_id))
    const developerName = safeString(item?.developer)

    developerRecord =
      (developerId
        ? developers.find((d: any) => String(d?.id) === String(developerId))
        : null) ||
      (developerName
        ? developers.find((d: any) => normalize(safeString(d?.name)) === normalize(developerName))
        : null) ||
      null
  } catch {
    developerRecord = null
  }

  const title = safeString(item?.name) || safeString(item?.title) || 'Project'
  const developer = safeString(item?.developer)
  const developerName = safeString(developerRecord?.name) || developer
  const developerLogoUrl = toImageUrl(developerRecord?.logo) || toImageUrl(developerRecord?.logo_image) || toImageUrl(developerRecord?.image) || ''
  const developerDescription =
    safeString(developerRecord?.description) || safeString(developerRecord?.about) || safeString(developerRecord?.bio)

  const region = safeString(item?.location?.region)
  const district = safeString(item?.location?.district)
  const sector = safeString(item?.location?.sector)
  const locationParts = [sector, district, region].filter(Boolean)
  const locationLabel = locationParts.join(', ')

  const saleStatus = safeString(item?.sale_status)
  const constructionStatus = safeString(item?.construction_status)
  const completionDate = safeString(item?.completion_date)

  const minPrice = safeNumber(item?.min_price)
  const maxPrice = safeNumber(item?.max_price)
  const priceOnRequest = minPrice <= 0

  const coverUrl = toImageUrl(item?.cover_image)
  const galleries: unknown[] = Array.isArray(item?.galleries)
    ? item.galleries
    : Array.isArray(item?.gallery)
      ? item.gallery
      : []
  const galleryUrls: string[] = galleries.map(toImageUrl).filter(Boolean)
  const images: string[] = [coverUrl, ...galleryUrls].filter(Boolean)

  const paymentPlans: unknown[] = Array.isArray(item?.payment_plans)
    ? item.payment_plans
    : Array.isArray(item?.paymentPlans)
      ? item.paymentPlans
      : []

  const projectAmenities: unknown[] = Array.isArray(item?.project_amenities)
    ? item.project_amenities
    : []

  const typicalUnits: unknown[] = Array.isArray(item?.typical_units)
    ? item.typical_units
    : []

  const description = safeString(item?.description)

  const lat = safeNumber(marker?.latitude ?? marker?.lat)
  const lng = safeNumber(marker?.longitude ?? marker?.lng ?? marker?.lon)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const internalRef =
    safeString(item?.internal_reference) || safeString(item?.internalRef) || safeString(item?.reference) || safeString(item?.ref)

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[420px] md:h-[560px] overflow-hidden">
        <Image
          src={coverUrl || '/image-placeholder.svg'}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized={(coverUrl || '').startsWith('http')}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-full flex items-end pb-10">
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-3">
                {constructionStatus ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur">
                    {constructionStatus.replace(/_/g, ' ')}
                  </span>
                ) : null}
                {saleStatus ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur">
                    {saleStatus.replace(/_/g, ' ')}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                {title}
              </h1>

              <p className="mt-2 text-white/90 text-sm sm:text-base">
                {developerName ? `${developerName} • ` : ''}
                {sector ? `${sector} • ` : ''}
                {district ? `${district} • ` : ''}
                {region}
              </p>

              <p className="mt-4 text-2xl sm:text-3xl font-bold text-white">
                {priceOnRequest ? 'Price on Request' : `From ${formatAed(minPrice)}`}
              </p>
              {maxPrice > 0 ? <p className="mt-1 text-white/80">Up to {formatAed(maxPrice)}</p> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-10">
        <div className="space-y-10">
          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">Image Gallery</h2>
            <p className="mt-2 text-gray-600">Browse cover and gallery images.</p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
              <PropertyGallery images={images} title={title} heightClassName="relative h-[320px] sm:h-[420px] md:h-[520px]" />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">Project Overview</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600">Project name</p>
                <p className="text-lg font-semibold text-dark-blue mt-1">{title}</p>
              </div>
              {developerName ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Developer</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1">{developerName}</p>
                </div>
              ) : null}
              {constructionStatus ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Construction status</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1">{constructionStatus.replace(/_/g, ' ')}</p>
                </div>
              ) : null}
              {completionDate ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Completion date</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1">{completionDate}</p>
                </div>
              ) : null}
              {saleStatus ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Sale status</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1">{saleStatus.replace(/_/g, ' ')}</p>
                </div>
              ) : null}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600">Project ID</p>
                <p className="text-lg font-semibold text-dark-blue mt-1">{safeString(item?.id) || String(safeNumber(item?.id))}</p>
              </div>
              {internalRef ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 md:col-span-2">
                  <p className="text-xs text-gray-600">Internal reference</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1 break-words">{internalRef}</p>
                </div>
              ) : null}
            </div>
          </section>

          {paymentPlans.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Pricing & Payment Plans</h2>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {minPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Min price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(minPrice)}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Min price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">Price on Request</p>
                  </div>
                )}

                {maxPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Max price</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(maxPrice)}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-dark-blue">Available payment plans</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentPlans.map((p: any, idx: number) => {
                    const name = safeString(p?.name) || safeString(p?.title) || `Plan ${idx + 1}`
                    const booking = safeNumber(p?.booking_percent ?? p?.bookingPercentage)
                    const during = safeNumber(p?.during_construction_percent ?? p?.duringConstructionPercent)
                    const handover = safeNumber(p?.on_handover_percent ?? p?.onHandoverPercent)

                    const hasAnyBreakdown = booking > 0 || during > 0 || handover > 0

                    return (
                      <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                        <p className="text-base font-semibold text-dark-blue">{name}</p>

                        {hasAnyBreakdown ? (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {booking > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">Booking</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{booking}%</p>
                              </div>
                            ) : null}
                            {during > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">During construction</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{during}%</p>
                              </div>
                            ) : null}
                            {handover > 0 ? (
                              <div className="bg-white rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-600">On handover</p>
                                <p className="text-lg font-semibold text-dark-blue mt-1">{handover}%</p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-600">Plan breakdown details are not available.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {projectAmenities.length > 0 ? (
            <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Amenities</h2>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {projectAmenities
                  .map((a: any) => {
                    const name = safeString(a?.amenity?.name) || safeString(a?.name)
                    const iconUrl = toImageUrl(a?.icon) || toImageUrl(a?.amenity?.icon)
                    return { name, iconUrl }
                  })
                  .filter((a: any) => a.name)
                  .map((a: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white overflow-hidden relative">
                        <Image
                          src={a.iconUrl || '/image-placeholder.svg'}
                          alt={a.name}
                          fill
                          className="object-contain p-2"
                          unoptimized={(a.iconUrl || '').startsWith('http')}
                          loading="lazy"
                        />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-dark-blue">{a.name}</p>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {typicalUnits.length > 0 ? (
            <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Typical Units</h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {typicalUnits.map((u: any, idx: number) => {
                  const unitType = safeString(u?.unit_type) || safeString(u?.type) || safeString(u?.name)
                  const sizeFrom = safeNumber(u?.size_from ?? u?.min_size ?? u?.minSize)
                  const sizeTo = safeNumber(u?.size_to ?? u?.max_size ?? u?.maxSize)
                  const starting = safeNumber(u?.starting_price ?? u?.start_price ?? u?.price_from ?? u?.min_price)

                  const sizeLabel =
                    sizeFrom > 0 && sizeTo > 0
                      ? `${sizeFrom} - ${sizeTo}`
                      : sizeFrom > 0
                        ? `From ${sizeFrom}`
                        : sizeTo > 0
                          ? `Up to ${sizeTo}`
                          : ''

                  if (!unitType && !sizeLabel && starting <= 0) return null

                  return (
                    <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                      <p className="text-base font-semibold text-dark-blue">{unitType || `Unit ${idx + 1}`}</p>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sizeLabel ? (
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="text-xs text-gray-600">Size range</p>
                            <p className="text-lg font-semibold text-dark-blue mt-1">{sizeLabel}</p>
                          </div>
                        ) : null}
                        {starting > 0 ? (
                          <div className="bg-white rounded-xl p-3 border border-gray-200">
                            <p className="text-xs text-gray-600">Starting price</p>
                            <p className="text-lg font-semibold text-dark-blue mt-1">{formatAed(starting)}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">Location & Map</h2>
            <p className="mt-2 text-gray-700">{locationLabel || region || 'Location'}</p>

            {hasCoords ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <LazyMap lat={lat} lng={lng} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">Map coordinates are not available for this project yet.</p>
            )}

            {hasCoords ? (
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-dark-blue hover:underline"
              >
                Open in Google Maps
              </a>
            ) : null}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">Developer</h2>
            <div className="mt-6 flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl border border-gray-200 bg-white overflow-hidden relative">
                <Image
                  src={developerLogoUrl || '/image-placeholder.svg'}
                  alt={developerName || 'Developer'}
                  fill
                  className="object-contain p-2"
                  unoptimized={(developerLogoUrl || '').startsWith('http')}
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-dark-blue">{developerName || 'Developer'}</p>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {developerDescription || 'Developer profile will be updated soon.'}
                </p>
                {developerName ? (
                  <Link
                    href={`/properties?developer=${encodeURIComponent(developerName)}`}
                    className="mt-4 inline-flex text-sm font-semibold text-dark-blue hover:underline"
                  >
                    View all projects by this developer
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {description ? (
            <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Project Description</h2>
              <p className="mt-4 text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
            </section>
          ) : null}

          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">Take the Next Step</h2>
            <p className="mt-2 text-gray-600">Talk to an agent and get the latest availability, pricing, and payment options.</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/contact"
                className="h-12 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center"
              >
                Contact Agent
              </Link>
              <Link
                href="/contact"
                className="h-12 rounded-xl bg-accent-yellow text-dark-blue font-semibold inline-flex items-center justify-center"
              >
                Enquire Now
              </Link>
              <Link
                href="/contact"
                className="h-12 rounded-xl bg-gray-100 text-dark-blue font-semibold inline-flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                Request Brochure
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

