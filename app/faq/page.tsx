import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FAQ | MillionFlats',
  description: 'Explore our most common questions around buying, renting, agent registration, and partnership opportunities.',
}

const faqSections = [
  {
    title: 'Buying & Renting',
    items: [
      {
        question: 'How do I shortlist premium properties on MillionFlats?',
        answer: 'Use the buy and rent discovery experience to filter by country, city, community, price, and property type. You can also save the best matches and request a consultation directly from the listing experience.',
      },
      {
        question: 'Can I schedule a viewing before committing to a property?',
        answer: 'Yes. Each listing can be connected to a guided consultation or a live tour request so you can review the asset with a trusted advisor before making a decision.',
      },
    ],
  },
  {
    title: 'Agent & Partner Registration',
    items: [
      {
        question: 'Why is the reference field requested during registration?',
        answer: 'The reference field helps us understand how you discovered MillionFlats so we can tailor onboarding, provide the right partner introductions, and ensure every lead is routed appropriately.',
      },
      {
        question: 'What happens after I submit a registration form?',
        answer: 'Your application is reviewed by our team. Once approved, you can access the relevant dashboard and start receiving qualified opportunities.',
      },
    ],
  },
  {
    title: 'Support & Partnerships',
    items: [
      {
        question: 'How can I become an ecosystem partner?',
        answer: 'You can submit an application through the partner registration pages and we will review your company profile, service areas, and business goals before onboarding you.',
      },
      {
        question: 'Do you support international buyers and investors?',
        answer: 'Yes. MillionFlats supports cross-border buyers across key markets and can coordinate with advisors and legal teams for a smooth transaction journey.',
      },
    ],
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqSections.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  ),
}

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-orange">Support Center</p>
            <h1 className="mt-3 text-4xl font-serif font-bold text-dark-blue sm:text-5xl">Frequently asked questions</h1>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to know about MillionFlats before you begin your next move.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {faqSections.map((section) => (
              <section key={section.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-serif font-semibold text-dark-blue">{section.title}</h2>
                <div className="mt-6 space-y-4">
                  {section.items.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-dark-blue p-6 text-white shadow-sm">
              <h2 className="text-xl font-semibold">Need more help?</h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Speak with our team for property guidance, onboarding support, or partnership inquiries.
              </p>
              <Link href="/contact" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-dark-blue">
                Contact our team
              </Link>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-dark-blue">Quick links</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li><Link href="/buy" className="hover:text-dark-blue">Browse properties to buy</Link></li>
                <li><Link href="/rent" className="hover:text-dark-blue">Explore rentals</Link></li>
                <li><Link href="/agent/auth" className="hover:text-dark-blue">Register as an agent</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
