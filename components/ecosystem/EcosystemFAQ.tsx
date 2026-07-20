import type { EcosystemFaq } from '@/lib/ecosystem/categoryConfig'

export default function EcosystemFAQ({ title, faqs }: { title: string; faqs: EcosystemFaq[] }) {
  return (
    <section className="bg-white py-24" id="faq">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">FAQ</p>
          <h2 className="mt-4 text-[38px] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[42px]">{title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-[18px] leading-8 text-slate-600">
            Answers to the most common questions from businesses, project owners, and partners exploring the MillionFlats ecosystem.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {faqs.map((f, index) => (
            <details
              key={f.question}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition-all duration-300 open:shadow-[0_26px_80px_rgba(15,23,42,0.09)] hover:-translate-y-1 hover:border-slate-300"
              open={index < 2}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-left">
                <span className="text-[18px] font-extrabold leading-7 text-slate-950">{f.question}</span>
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-transform duration-300 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-[16px] leading-7 text-slate-600">{f.answer}</p>
            </details>
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
