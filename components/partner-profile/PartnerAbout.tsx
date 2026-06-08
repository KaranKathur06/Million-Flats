import type { PartnerProfileData } from './types'

type PartnerAboutProps = {
  partner: PartnerProfileData
}

export default function PartnerAbout({ partner }: PartnerAboutProps) {
  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">About {partner.name}</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Trusted ecosystem partner on MillionFlats.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="whitespace-pre-line text-sm leading-7 text-gray-700 sm:text-base">{partner.description}</p>
          {partner.pricingRange && (
            <p className="mt-4 text-sm font-semibold text-dark-blue">
              Typical Budget Range: <span className="font-normal text-gray-600">{partner.pricingRange}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
