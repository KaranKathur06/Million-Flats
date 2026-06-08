import type { PartnerServiceItem } from './types'

type PartnerServicesProps = {
  services: PartnerServiceItem[]
  partnerName: string
}

export default function PartnerServices({ services, partnerName }: PartnerServicesProps) {
  if (services.length === 0) return null

  return (
    <section className="bg-gray-50 py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Services</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">What {partnerName} offers through MillionFlats.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-dark-blue/5 text-dark-blue">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-dark-blue">{svc.name}</h3>
              {svc.description && (
                <p className="mt-1 text-xs text-gray-500">{svc.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
