import type { EcosystemFaq } from '@/lib/ecosystem/categoryConfig'

export default function EcosystemFAQ({ title, faqs }: { title: string; faqs: EcosystemFaq[] }) {
  return (
    <section className="py-12" id="faq">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">{title}</h2>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((f) => (
            <div key={f.question} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-sm font-semibold text-gray-900">{f.question}</div>
              <div className="mt-2 text-sm text-gray-600">{f.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function buildFaqSchema({
  url,
  faqs,
}: {
  url: string
  faqs: EcosystemFaq[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
    url,
  }
}
