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
    <section id="partner-locations" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Coverage</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Service locations
        </h2>
        <p className="mt-1 text-sm text-slate-600">Areas served by {partnerName}.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((location) => (
          <div
            key={location.id}
            className={`rounded-2xl border p-4 ${
              location.isPrimary
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                : 'border-slate-200 bg-white text-[#1e3a5f]'
            }`}
          >
            <svg
              className={`mb-2 h-5 w-5 ${location.isPrimary ? 'text-[#fbbf24]' : 'text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <div className="font-semibold">{location.city}</div>
            {location.region && <div className="mt-1 text-xs opacity-70">{location.region}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
