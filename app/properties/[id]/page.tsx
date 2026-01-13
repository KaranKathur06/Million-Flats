import { notFound } from 'next/navigation'
import PropertyGallery from '@/components/PropertyGallery'
import AgentCard from '@/components/AgentCard'
import { formatCountryPrice } from '@/lib/country'
import { reellyGetProject } from '@/lib/reelly'

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  let item: any
  try {
    item = await reellyGetProject<any>(params.id)
  } catch {
    notFound()
  }

  const title = String(item?.title ?? item?.name ?? 'Property')
  const price = Number(item?.price ?? item?.min_price ?? item?.starting_price ?? item?.price_from ?? 0)
  const bedrooms = Number(item?.beds ?? item?.bedrooms ?? 0)
  const bathrooms = Number(item?.baths ?? item?.bathrooms ?? 0)
  const squareFeet = Number(item?.area ?? item?.size ?? item?.square_feet ?? 0)
  const propertyType = String(item?.type ?? item?.property_type ?? 'Property')

  const city = String(item?.city ?? item?.location?.city ?? '')
  const country = String(item?.country ?? item?.location?.country ?? 'UAE')
  const location = String(item?.community ?? item?.location?.community ?? city)

  const images: string[] = Array.isArray(item?.images)
    ? item.images
    : Array.isArray(item?.gallery)
      ? item.gallery
      : item?.cover_image
        ? [String(item.cover_image)]
        : []

  const description = String(item?.description ?? item?.about ?? '')
  const features: string[] = Array.isArray(item?.amenities)
    ? item.amenities.map((a: any) => String(a))
    : Array.isArray(item?.features)
      ? item.features.map((f: any) => String(f))
      : []

  const agent = item?.agent || item?.broker || null
  const agentPhone = String(agent?.phone ?? agent?.whatsapp ?? '')
  const agentCardAgent = agent
    ? {
        id: String(agent?.id ?? agent?.email ?? agent?.phone ?? 'external-agent'),
        name: String(agent?.name ?? agent?.full_name ?? 'Agent'),
        email: String(agent?.email ?? ''),
        phone: agentPhone,
        avatar: agent?.avatar ? String(agent.avatar) : undefined,
        bio: agent?.bio ? String(agent.bio) : undefined,
        propertiesSold: typeof agent?.propertiesSold === 'number' ? agent.propertiesSold : undefined,
      }
    : null
  const whatsappNumber = agentPhone.replace(/[^\d]/g, '')
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''

  const resolvedImages = images
  const loanTermYears = 25
  const annualRate = 0.065
  const monthlyRate = annualRate / 12
  const downPaymentPct = 0.2
  const principal = price * (1 - downPaymentPct)
  const totalPayments = loanTermYears * 12
  const monthlyPayment =
    monthlyRate === 0
      ? principal / totalPayments
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments))

  const estimatedAnnualRent = price * 0.055
  const grossYield = price ? (estimatedAnnualRent / price) * 100 : 0

  return (
    <div className="min-h-screen bg-white">
      {/* Gallery Section */}
      <PropertyGallery images={resolvedImages} title={title} />

      <div className="md:hidden sticky top-14 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-bold text-dark-blue leading-tight truncate">
              {formatCountryPrice(country === 'India' ? 'India' : 'UAE', price)}
            </p>
            <p className="text-xs text-gray-600 truncate">{location}, {country}</p>
          </div>
          <div className="shrink-0">
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              {propertyType}
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
                {formatCountryPrice(country === 'India' ? 'India' : 'UAE', price)}
              </p>
              <h1 className="mt-0 md:mt-3 text-2xl md:text-4xl font-serif font-bold text-dark-blue">
                {title}
              </h1>
              <p className="mt-2 text-gray-600">
                {location}, {country}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 md:hidden">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Beds</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{bedrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Baths</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{bathrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Area</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{Math.round(squareFeet).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{propertyType}</p>
                </div>
              </div>

              <div className="mt-6 hidden md:grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Bedrooms</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{bedrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Bathrooms</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{bathrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Built-up Area</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{Math.round(squareFeet).toLocaleString()} sq ft</p>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(features || []).map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-accent-yellow" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Concierge', 'Gym & Spa', 'Private Parking', 'Swimming Pool', '24/7 Security', 'High-Speed Elevators'].map((a) => (
                    <div key={a} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-accent-yellow" />
                      <span className="text-sm text-gray-700">{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-dark-blue">Mortgage Calculator</h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Price</span>
                      <span className="font-semibold">{formatCountryPrice(country === 'India' ? 'India' : 'UAE', price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Down payment</span>
                      <span className="font-semibold">{Math.round(downPaymentPct * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Interest rate</span>
                      <span className="font-semibold">{(annualRate * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Term</span>
                      <span className="font-semibold">{loanTermYears} years</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-gray-600">Estimated monthly</span>
                      <span className="text-lg font-bold text-dark-blue">
                        {formatCountryPrice(country === 'India' ? 'India' : 'UAE', Math.round(monthlyPayment))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-dark-blue">ROI / Rental Yield</h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Est. annual rent</span>
                      <span className="font-semibold">{formatCountryPrice(country === 'India' ? 'India' : 'UAE', Math.round(estimatedAnnualRent))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Gross yield</span>
                      <span className="font-semibold">{grossYield.toFixed(2)}%</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-gray-600">Static estimates for demo; API-ready structure.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Location</h2>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 h-80 flex items-center justify-center text-gray-500">
                  Map placeholder
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <p className="text-2xl font-bold text-dark-blue">{formatCountryPrice(country === 'India' ? 'India' : 'UAE', price)}</p>
                  <p className="text-sm text-gray-600 mt-1">{location}, {country}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={`tel:${agentPhone || ''}`}
                    className="w-full bg-dark-blue text-white py-3 rounded-xl font-semibold hover:bg-dark-blue/90 transition-colors text-center"
                  >
                    Call
                  </a>
                  <a
                    href={whatsappHref || undefined}
                    target={whatsappHref ? '_blank' : undefined}
                    rel={whatsappHref ? 'noreferrer' : undefined}
                    className="w-full bg-gray-100 text-dark-blue py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-center"
                  >
                    WhatsApp
                  </a>
                  <button className="w-full bg-accent-yellow text-dark-blue py-3 rounded-xl font-semibold hover:bg-accent-yellow/90 transition-colors">
                    Book Viewing
                  </button>
                </div>
              </div>

              {agentCardAgent && agentCardAgent.email && agentCardAgent.phone ? (
                <AgentCard agent={agentCardAgent} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-3 gap-3">
            <a
              href={`tel:${agentPhone || ''}`}
              className="h-12 rounded-xl bg-dark-blue text-white font-semibold inline-flex items-center justify-center"
            >
              Call
            </a>
            <a
              href={whatsappHref || undefined}
              target={whatsappHref ? '_blank' : undefined}
              rel={whatsappHref ? 'noreferrer' : undefined}
              className="h-12 rounded-xl bg-gray-100 text-dark-blue font-semibold inline-flex items-center justify-center"
            >
              WhatsApp
            </a>
            <button className="h-12 rounded-xl bg-accent-yellow text-dark-blue font-semibold">
              Book Viewing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

