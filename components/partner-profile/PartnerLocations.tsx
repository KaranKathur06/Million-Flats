import type { PartnerLocationItem } from './types'

type PartnerLocationsProps = {
  locations: PartnerLocationItem[]
  locationCoverage: string | null
  partnerName: string
}

export default function PartnerLocations({ locations, locationCoverage, partnerName }: PartnerLocationsProps) {
  const cities =
    locations.length > 0
      ? locations
      : (locationCoverage?.split(',').map((s) => s.trim()).filter(Boolean) || []).map((city, i) => ({
          id: `cov-${i}`,
          city,
          region: null,
          isPrimary: i === 0,
        }))

  if (cities.length === 0) return null

  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Service Locations</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Where {partnerName} operates.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((loc) => (
            <div
              key={loc.id}
              className={`rounded-2xl border p-4 text-center ${
                loc.isPrimary
                  ? 'border-dark-blue bg-dark-blue text-white'
                  : 'border-gray-200 bg-white text-dark-blue'
              }`}
            >
              <svg
                className={`mx-auto mb-2 h-5 w-5 ${loc.isPrimary ? 'text-accent-yellow' : 'text-gray-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <div className="font-semibold">{loc.city}</div>
              {loc.region && <div className="mt-1 text-xs opacity-70">{loc.region}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
