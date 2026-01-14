import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
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
  if (safeString(item?.sale_status) && safeString(item?.sale_status) !== 'on_sale') notFound()

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

  const constructionStatus = safeString(item?.construction_status)
  const completionDate = safeString(item?.completion_date)

  const minPrice = safeNumber(item?.min_price)
  const maxPrice = safeNumber(item?.max_price)
  const priceOnRequest = minPrice <= 0

  const coverUrl = toImageUrl(item?.cover_image)
  const galleryUrls: string[] = Array.isArray(item?.gallery)
    ? item.gallery.map(toImageUrl).filter(Boolean)
    : []
  const images: string[] = [coverUrl, ...galleryUrls].filter(Boolean)

  const description = safeString(item?.description)

  const lat = safeNumber(marker?.latitude ?? marker?.lat)
  const lng = safeNumber(marker?.longitude ?? marker?.lng ?? marker?.lon)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const internalRef =
    safeString(item?.internal_reference) || safeString(item?.internalRef) || safeString(item?.reference) || safeString(item?.ref)

  return (
    <div className="min-h-screen bg-white">
      <PropertyGallery images={images} title={title} />

      <div className="md:hidden sticky top-14 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-dark-blue leading-tight truncate">
              {priceOnRequest ? 'Price on request' : `From ${formatAed(minPrice)}`}
            </p>
            <p className="text-xs text-gray-600 truncate">{locationLabel || region || 'Location'}</p>
          </div>
          <div className="shrink-0">
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              {constructionStatus ? constructionStatus.replace(/_/g, ' ') : 'Project'}
            </span>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <p className="hidden md:block text-4xl md:text-5xl font-bold text-dark-blue tracking-tight">
                {priceOnRequest ? 'Price on request' : `From ${formatAed(minPrice)}`}
              </p>
              <h1 className="mt-0 md:mt-3 text-2xl md:text-4xl font-serif font-bold text-dark-blue">
                {title}
              </h1>
              <p className="mt-2 text-gray-600">{locationLabel || region || 'Location'}</p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {developerName ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Developer</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{developerName}</p>
                  </div>
                ) : null}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Availability</p>
                  <p className="text-lg font-semibold text-dark-blue mt-1">Available</p>
                </div>
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
                {minPrice > 0 || maxPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 md:col-span-2">
                    <p className="text-xs text-gray-600">Price range</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">
                      {minPrice > 0 ? `From ${formatAed(minPrice)}` : 'Price on request'}
                      {maxPrice > 0 ? ` • Up to ${formatAed(maxPrice)}` : ''}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Developer</h2>
                  <div className="flex items-start gap-4">
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
                      <p className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-4">
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
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Location & Map</h2>
                  <p className="text-gray-700">{locationLabel || region || 'Location'}</p>
                  {hasCoords ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      <iframe
                        title="Project location"
                        loading="lazy"
                        className="w-full h-[320px]"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=15&output=embed`}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">Map coordinates are not available for this project yet.</p>
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
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Project Metadata</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-600">Project ID</p>
                      <p className="text-lg font-semibold text-dark-blue mt-1">{safeString(item?.id) || String(safeNumber(item?.id))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-600">Availability</p>
                      <p className="text-lg font-semibold text-dark-blue mt-1">Available</p>
                    </div>
                    {internalRef ? (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 md:col-span-2">
                        <p className="text-xs text-gray-600">Reference</p>
                        <p className="text-lg font-semibold text-dark-blue mt-1 break-words">{internalRef}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{description || 'Project details will be updated soon.'}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <p className="text-2xl font-bold text-dark-blue">
                    {priceOnRequest ? 'Price on request' : `From ${formatAed(minPrice)}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{locationLabel || region || 'Location'}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Link
                    href="/contact"
                    className="w-full bg-dark-blue text-white py-3 rounded-xl font-semibold hover:bg-dark-blue/90 transition-colors text-center"
                  >
                    Enquire Now
                  </Link>
                  <Link
                    href="/contact"
                    className="w-full bg-gray-100 text-dark-blue py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-center"
                  >
                    Request Brochure
                  </Link>
                  <Link
                    href="/contact"
                    className="w-full bg-accent-yellow text-dark-blue py-3 rounded-xl font-semibold hover:bg-accent-yellow/90 transition-colors text-center"
                  >
                    Book a Call
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/contact"
              className="h-12 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center"
            >
              Enquire
            </Link>
            <Link
              href="/contact"
              className="h-12 rounded-xl bg-gray-100 text-dark-blue font-semibold inline-flex items-center justify-center"
            >
              Brochure
            </Link>
            <Link
              href="/contact"
              className="h-12 rounded-xl bg-accent-yellow text-dark-blue font-semibold inline-flex items-center justify-center"
            >
              Book Call
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

