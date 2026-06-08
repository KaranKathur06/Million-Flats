import type { PartnerWhyChooseItem } from './types'

type PartnerTrustProps = {
  partnerName: string
  items: PartnerWhyChooseItem[]
}

export default function PartnerTrust({ partnerName, items }: PartnerTrustProps) {
  return (
    <section className="bg-gray-50 py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">Why Choose {partnerName}</h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Confidence built through verified expertise and transparent delivery.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-dark-blue">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
