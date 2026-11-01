import type { PartnerServiceItem } from './types'

type PartnerServicesProps = {
  services: PartnerServiceItem[]
  partnerName: string
}

export default function PartnerServices({ services, partnerName }: PartnerServicesProps) {
  if (services.length === 0) return null

  return (
    <section id="partner-services" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Offerings</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Services from {partnerName}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1e3a5f]/30 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/5 text-[#1e3a5f]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#1e3a5f]">{service.name}</h3>
                {service.description && (
                  <p className="mt-1 text-sm leading-6 text-slate-600">{service.description}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
