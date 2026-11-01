import type { PartnerProfileData } from './types'

type PartnerAboutProps = {
  partner: PartnerProfileData
}

export default function PartnerAbout({ partner }: PartnerAboutProps) {
  if (!partner.description && !partner.pricingRange) return null

  return (
    <section id="partner-overview" className="scroll-mt-28 py-7">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Partner overview</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          About {partner.name}
        </h2>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {partner.description && (
          <p className="whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
            {partner.description}
          </p>
        )}
        {partner.pricingRange && (
          <p className={`text-sm text-slate-700 ${partner.description ? 'mt-4 border-t border-slate-100 pt-4' : ''}`}>
            <span className="font-semibold text-[#1e3a5f]">Typical budget range:</span>{' '}
            {partner.pricingRange}
          </p>
        )}
      </div>
    </section>
  )
}
