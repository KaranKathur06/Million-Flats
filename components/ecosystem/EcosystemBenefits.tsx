import type { EcosystemBenefit } from '@/lib/ecosystem/categoryConfig'

export default function EcosystemBenefits({
  title,
  benefits,
}: {
  title: string
  benefits: EcosystemBenefit[]
}) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">{title}</h2>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-sm font-semibold text-gray-900">{b.title}</div>
              <div className="mt-2 text-sm text-gray-600">{b.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
