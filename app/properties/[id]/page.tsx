import { notFound } from 'next/navigation'
import PropertyGallery from '@/components/PropertyGallery'
import AgentCard from '@/components/AgentCard'
import { formatCountryPrice } from '@/lib/country'
import { mockProperties } from '@/lib/mockData'
import { resolveImagesForProperty } from '@/lib/propertyImages'

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = mockProperties.find((p) => p.id === params.id)

  if (!property) {
    notFound()
  }

  const whatsappNumber = property.agent?.phone?.replace(/[^\d]/g, '') || ''
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : ''
  const resolvedImages = resolveImagesForProperty(property)
  const loanTermYears = 25
  const annualRate = 0.065
  const monthlyRate = annualRate / 12
  const downPaymentPct = 0.2
  const principal = property.price * (1 - downPaymentPct)
  const totalPayments = loanTermYears * 12
  const monthlyPayment =
    monthlyRate === 0
      ? principal / totalPayments
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments))

  const estimatedAnnualRent = property.price * 0.055
  const grossYield = (estimatedAnnualRent / property.price) * 100

  return (
    <div className="min-h-screen bg-white">
      {/* Gallery Section */}
      <PropertyGallery images={resolvedImages} title={property.title} />

      {/* Details Section */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <p className="text-4xl md:text-5xl font-bold text-dark-blue tracking-tight">
                {formatCountryPrice(property.country, property.price)}
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-serif font-bold text-dark-blue">
                {property.title}
              </h1>
              <p className="mt-2 text-gray-600">
                {property.location}, {property.country}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Bedrooms</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{property.bedrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Bathrooms</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{property.bathrooms}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-600">Built-up Area</p>
                  <p className="text-2xl font-semibold text-dark-blue mt-1">{property.squareFeet.toLocaleString()} sq ft</p>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(property.features || []).map((f, idx) => (
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
                      <span className="font-semibold">{formatCountryPrice(property.country, property.price)}</span>
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
                        {formatCountryPrice(property.country, Math.round(monthlyPayment))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-dark-blue">ROI / Rental Yield</h3>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Est. annual rent</span>
                      <span className="font-semibold">{formatCountryPrice(property.country, Math.round(estimatedAnnualRent))}</span>
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
                  <p className="text-2xl font-bold text-dark-blue">{formatCountryPrice(property.country, property.price)}</p>
                  <p className="text-sm text-gray-600 mt-1">{property.location}, {property.country}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={`tel:${property.agent?.phone || ''}`}
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

              <AgentCard agent={property.agent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

