import type { PartnerProfileData } from './types'

type PartnerHeroProps = {
  partner: PartnerProfileData
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export default function PartnerHero({ partner }: PartnerHeroProps) {
  const locations =
    partner.locations.length > 0
      ? partner.locations.map((location) => location.city)
      : partner.locationCoverage?.split(',').map((city) => city.trim()).filter(Boolean) || []

  return (
    <section
      id="partner-identity"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="relative h-32 overflow-hidden bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.35),transparent_30%),linear-gradient(115deg,#1e3a5f,#16304f_65%,#10253f)] sm:h-40">
        {partner.coverImage && (
          <>
            <img
              src={partner.coverImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#10253f]/85 via-[#1e3a5f]/65 to-[#1e3a5f]/30" />
          </>
        )}
        <div className="absolute bottom-4 right-4 rounded-full border border-white/25 bg-[#10253f]/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur sm:bottom-5 sm:right-6">
          MillionFlats Ecosystem
        </div>
      </div>

      <div className="px-5 pb-6 sm:px-7 sm:pb-7">
        <div className="-mt-9 flex flex-col gap-5 sm:-mt-11 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            {partner.logo ? (
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className="h-[76px] w-[76px] shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-md sm:h-[88px] sm:w-[88px]"
              />
            ) : (
              <div
                aria-label={`${partner.name} initials`}
                className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-extrabold tracking-tight text-[#1e3a5f] shadow-md sm:h-[88px] sm:w-[88px]"
              >
                {getInitials(partner.name)}
              </div>
            )}

            <div className="min-w-0 pb-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[#1e3a5f]/15 bg-[#1e3a5f]/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1e3a5f]">
                  {partner.categoryTitle}
                </span>
                {partner.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                    <span aria-hidden="true" className="text-emerald-600">●</span>
                    Verified partner
                  </span>
                )}
                {partner.partnerSince && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    Partner since {partner.partnerSince}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1e3a5f] sm:text-3xl lg:text-4xl">
                {partner.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                {partner.tagline}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:pb-1">
            <a
              href="#partner-contact"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17304f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-offset-2"
            >
              Request consultation
            </a>
            <a
              href={
                partner.portfolios.length > 0 || partner.gallery.length > 0
                  ? '#partner-portfolio'
                  : partner.services.length > 0
                    ? '#partner-services'
                    : '#partner-identity'
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1e3a5f] transition hover:border-[#1e3a5f] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus-visible:ring-offset-2"
            >
              {partner.portfolios.length > 0 || partner.gallery.length > 0
                ? 'View portfolio'
                : partner.services.length > 0
                  ? 'Explore services'
                  : 'Partner details'}
            </a>
          </div>
        </div>

        {(partner.locationCoverage || locations.length > 0) && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service coverage
            </span>
            {locations.length > 0 ? (
              locations.slice(0, 6).map((city) => (
                <span
                  key={city}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {city}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-700">{partner.locationCoverage}</span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
