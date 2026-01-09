import { notFound } from 'next/navigation'
import Image from 'next/image'
import PropertyGallery from '@/components/PropertyGallery'
import PropertyDetails from '@/components/PropertyDetails'
import AgentCard from '@/components/AgentCard'

async function getProperty(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/properties/${id}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    return null
  }
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await getProperty(params.id)

  if (!property) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Gallery Section */}
      <PropertyGallery images={property.images} title={property.title} />

      {/* Details Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <PropertyDetails property={property} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-4xl font-bold text-dark-blue mb-2">
                  {new Intl.NumberFormat('en-AE', {
                    style: 'currency',
                    currency: 'AED',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(property.price)}
                </p>
                <p className="text-gray-600">{property.location}</p>
              </div>

              <button className="w-full bg-dark-blue text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors mb-4">
                Schedule Tour
              </button>
              <button className="w-full bg-transparent border-2 border-dark-blue text-dark-blue py-3 rounded-lg font-semibold hover:bg-dark-blue hover:text-white transition-colors">
                Contact Agent
              </button>
            </div>

            <AgentCard agent={property.agent} />
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-serif font-bold text-dark-blue mb-6">Location</h2>
          <div className="relative h-96 rounded-lg overflow-hidden">
            <Image
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+1e3a5f(${property.coordinates.lng},${property.coordinates.lat})/${property.coordinates.lng},${property.coordinates.lat},12,0/800x400?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
              alt="Property location"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

