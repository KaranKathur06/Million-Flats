import type { PartnerProfileData } from './types'

type PartnerHeroProps = {
  partner: PartnerProfileData
}

export default function PartnerHero({ partner }: PartnerHeroProps) {
  const locations = partner.locations.length > 0
    ? partner.locations.map((l) => l.city)
    : partner.locationCoverage?.split(',').map((s) => s.trim()).filter(Boolean) || []

  return (
    <section className="relative min-h-[520px] overflow-hidden bg-dark-blue">
      <img src={partner.coverImage} alt={partner.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-blue/95 via-dark-blue/85 to-dark-blue/40" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative mx-auto flex min-h-[520px] w-full max-w-[1200px] items-end px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <img
              src={partner.logo}
              alt={`${partner.name} logo`}
              className="h-16 w-16 rounded-xl border border-white/20 bg-white object-cover p-1.5 shadow-lg sm:h-20 sm:w-20"
            />
            {partner.verified && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <svg className="h-3.5 w-3.5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Partner
              </span>
            )}
            {partner.partnerSince && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
                Partner Since {partner.partnerSince}
              </span>
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-accent-yellow">{partner.categoryTitle}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{partner.name}</h1>
          <p className="mt-3 text-base text-white/80 sm:text-lg">{partner.tagline}</p>

          {locations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {locations.slice(0, 6).map((loc) => (
                <span key={loc} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
                  {loc}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#partner-contact"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-accent-yellow px-5 text-sm font-semibold text-dark-blue shadow-sm transition-colors hover:bg-accent-yellow/90"
            >
              Request Consultation
            </a>
            <a
              href="#partner-portfolio"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              View Portfolio
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
