import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import PropertyGallery from '@/components/PropertyGallery'
import { formatCountryPrice } from '@/lib/country'

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

function toImageUrl(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const u = (v as any).url
    if (typeof u === 'string') return u
  }
  return ''
}

function pickCountry(region: string) {
  return normalize(region) === 'india' ? 'India' : 'UAE'
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  let item: any
  try {
    const h = headers()
    const host = h.get('host')
    const proto = h.get('x-forwarded-proto') || 'http'
    if (!host) {
      notFound()
    }

    const url = `${proto}://${host}/api/properties/${encodeURIComponent(params.id)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      notFound()
    }

    const json = (await res.json()) as { item?: any }
    item = json?.item
    if (!item) {
      notFound()
    }
  } catch {
    notFound()
  }

  const title = safeString(item?.name) || safeString(item?.title) || 'Project'
  const developer = safeString(item?.developer)

  const region = safeString(item?.location?.region)
  const district = safeString(item?.location?.district)
  const sector = safeString(item?.location?.sector)
  const locationParts = [sector, district, region].filter(Boolean)
  const locationLabel = locationParts.join(', ')
  const country = pickCountry(region)

  const saleStatus = safeString(item?.sale_status)
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

  return (
    <div className="min-h-screen bg-white">
      <PropertyGallery images={images} title={title} />

      <div className="md:hidden sticky top-14 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-dark-blue leading-tight truncate">
              {priceOnRequest ? 'Price on request' : `From ${formatCountryPrice(country === 'India' ? 'India' : 'UAE', minPrice)}`}
            </p>
            <p className="text-xs text-gray-600 truncate">{locationLabel || region || 'Location'}, {country}</p>
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
                {priceOnRequest ? 'Price on request' : `From ${formatCountryPrice(country === 'India' ? 'India' : 'UAE', minPrice)}`}
              </p>
              <h1 className="mt-0 md:mt-3 text-2xl md:text-4xl font-serif font-bold text-dark-blue">
                {title}
              </h1>
              <p className="mt-2 text-gray-600">{locationLabel || region || 'Location'}, {country}</p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {developer ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Developer</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{developer}</p>
                  </div>
                ) : null}
                {saleStatus ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-600">Sale status</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">{saleStatus.replace(/_/g, ' ')}</p>
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
                {minPrice > 0 || maxPrice > 0 ? (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 md:col-span-2">
                    <p className="text-xs text-gray-600">Price range</p>
                    <p className="text-lg font-semibold text-dark-blue mt-1">
                      {minPrice > 0 ? `From ${formatCountryPrice(country === 'India' ? 'India' : 'UAE', minPrice)}` : 'Price on request'}
                      {maxPrice > 0 ? ` • Up to ${formatCountryPrice(country === 'India' ? 'India' : 'UAE', maxPrice)}` : ''}
                    </p>
                  </div>
                ) : null}
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
                    {priceOnRequest ? 'Price on request' : `From ${formatCountryPrice(country === 'India' ? 'India' : 'UAE', minPrice)}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{locationLabel || region || 'Location'}, {country}</p>
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

