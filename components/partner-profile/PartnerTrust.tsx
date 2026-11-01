import type { PartnerWhyChooseItem } from './types'

type PartnerTrustProps = {
  partnerName: string
  items: PartnerWhyChooseItem[]
}

export default function PartnerTrust({ partnerName, items }: PartnerTrustProps) {
  if (items.length === 0) return null

  return (
    <section id="partner-trust" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Partner strengths</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Why work with {partnerName}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1e3a5f]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
