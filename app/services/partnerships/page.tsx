import Link from 'next/link'
import { ECOSYSTEM_CATEGORIES, categoryHref, partnerRegistrationHref } from '@/lib/ecosystemPartners'

export const metadata = {
  title: 'Partnerships - MillionFlats',
}

const benefits = [
  {
    title: 'Qualified Business Leads',
    description: 'Receive inquiries from people actively buying, selling, or investing in property.',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    title: 'Verified Marketplace',
    description: 'Build trust through the MillionFlats Verified Partner badge and premium placement.',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
  {
    title: 'National Exposure',
    description: 'Showcase your business across India and UAE through a premium ecosystem of listing pages, landing pages, and campaigns.',
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.055A9.001 9.001 0 0114.945 7M8 3.055V5m6.945 2A9.001 9.001 0 0116 14.945M16 3.055V5m0 14v2.945M12 7v2m0 6v2',
  },
  {
    title: 'Performance-Based Growth',
    description: 'We grow when your business grows, which is why our partnership model is built around outcomes rather than upfront fees.',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Long-Term Partnership',
    description: 'No listing fees, no hidden charges, and no lock-ins—just a transparent operating model for long-term collaboration.',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]

const workflowSteps = [
  { title: 'Submit Application', description: 'Share your business profile and the services you want to offer.' },
  { title: 'Business Verification', description: 'Our team confirms credentials, coverage, and business quality.' },
  { title: 'Partnership Approval', description: 'Your profile is reviewed and approved for the MillionFlats network.' },
  { title: 'Profile Published', description: 'Your business goes live in the ecosystem partner directory.' },
  { title: 'Receive Qualified Leads', description: 'Leads flow into the MillionFlats CRM for your team to follow up.' },
  { title: 'Grow Together', description: 'Scale with us through referral opportunities and long-term collaboration.' },
]

const faqItems = [
  {
    question: 'Is listing free?',
    answer: 'Yes. Listing your business with MillionFlats is completely free, and revenue is shared only after successful engagement or transaction.',
  },
  {
    question: 'How do I receive leads?',
    answer: 'Qualified leads are routed through the MillionFlats CRM so every partner can manage opportunities, follow-up, and conversion tracking.',
  },
  {
    question: 'When do I pay?',
    answer: 'You only pay when the partnership generates successful business through the platform.',
  },
  {
    question: 'Can anyone join?',
    answer: 'Businesses must be verified before approval so the ecosystem remains trusted, relevant, and high quality.',
  },
  {
    question: 'How long does approval take?',
    answer: 'Most applications are reviewed within 3–5 business days depending on the category and document readiness.',
  },
]

export default function ServicePartnershipsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-emerald-200 selection:text-emerald-900 flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-5%] -left-32 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/20 blur-[140px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-100/40 to-blue-100/30 blur-[140px] mix-blend-multiply" />

      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-extrabold text-emerald-700 shadow-sm mb-8">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          Trusted ecosystem partnership network
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Partner with MillionFlats
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mt-3">
            Grow your business through India&apos;s intelligent real estate ecosystem
          </span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-slate-600 leading-relaxed font-medium max-w-3xl mx-auto">
          Join a verified ecosystem of trusted service providers and connect with genuine buyers, sellers, investors, and developers at the precise moment they need your expertise.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <a href="#categories" className="group relative inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-gradient-to-r from-dark-blue to-emerald-900 text-white font-extrabold text-base overflow-hidden shadow-[0_10px_40px_rgba(6,95,70,0.2)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            Become a Partner
          </a>
        </div>
      </section>

      <section id="benefits" className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-dark-blue tracking-tight">Why Partner with MillionFlats</h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">A partnership built around trust, qualified demand, and long-term growth.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((item, index) => (
            <div key={index} className="group rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_18px_40px_rgba(16,185,129,0.08)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="bg-dark-blue relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 shadow-inner my-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_45%)]" />
        <div className="max-w-[1240px] mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-serif font-extrabold text-white">Who Should Apply?</h2>
            <p className="mt-4 text-slate-200 max-w-2xl mx-auto text-lg font-medium">Our ecosystem supports 12 partner categories across property, finance, legal, interiors, operations, and technology.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ECOSYSTEM_CATEGORIES.map((category) => (
              <div key={category.slug} className="rounded-[1.75rem] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Verified
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{category.description}</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link href={categoryHref(category.slug)} className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                    Learn More
                  </Link>
                  <Link href={partnerRegistrationHref(category.slug)} className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-dark-blue transition hover:shadow-lg">
                    Become Partner
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-16 z-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 lg:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-dark-blue">How Partnership Works</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">A clear path from application to growth, designed for speed and trust.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-6">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {index + 1}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-dark-blue">Revenue Sharing Model</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">We only earn after you earn.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Performance-first ecosystem</div>
              <h3 className="mt-5 text-2xl font-bold text-slate-900">No listing fees. No joining charges. No annual subscriptions.</h3>
              <p className="mt-4 text-slate-600 leading-7">MillionFlats is designed to align our success with yours. Partners share revenue only after successful business is generated through the platform.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {['Performance Driven', 'Transparent', 'Win-Win', 'Partner First'].map((badge) => (
                  <div key={badge} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {[
                ['List Your Business', 'Free'],
                ['Receive Qualified Leads', 'Free'],
                ['Convert Customer', 'You Earn'],
                ['Revenue Share', 'Only after successful transaction'],
              ].map(([title, value]) => (
                <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
                  <div className="mt-2 text-2xl font-bold text-dark-blue">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-16 z-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-dark-blue">Comparison</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto text-lg font-medium">A simpler, more effective model than traditional directories.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse rounded-2xl overflow-hidden">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-4 text-sm font-semibold text-slate-700">Model</th>
                  <th className="px-4 py-4 text-sm font-semibold text-slate-700">Listing Fee</th>
                  <th className="px-4 py-4 text-sm font-semibold text-slate-700">Lead Quality</th>
                  <th className="px-4 py-4 text-sm font-semibold text-slate-700">Revenue Model</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-4 font-semibold text-slate-900">Traditional Directories</td>
                  <td className="px-4 py-4 text-slate-600">Annual fee</td>
                  <td className="px-4 py-4 text-slate-600">Cold leads</td>
                  <td className="px-4 py-4 text-slate-600">Subscription</td>
                </tr>
                <tr className="border-t border-slate-200 bg-emerald-50/40">
                  <td className="px-4 py-4 font-semibold text-slate-900">MillionFlats</td>
                  <td className="px-4 py-4 text-emerald-700">Free listing</td>
                  <td className="px-4 py-4 text-emerald-700">Qualified leads</td>
                  <td className="px-4 py-4 text-emerald-700">Performance revenue share</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full pb-16 z-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-dark-blue">FAQ</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-dark-blue py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden mt-auto border-t border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 to-dark-blue/80 pointer-events-none opacity-90" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-white font-serif font-extrabold text-4xl sm:text-5xl tracking-tight leading-tight">Ready to Grow With MillionFlats?</h2>
          <p className="text-emerald-100/90 mt-6 text-lg sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">Join our trusted ecosystem of verified partners and reach genuine customers across India and UAE.</p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a href="#categories" className="inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-white text-dark-blue font-extrabold text-base shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.01] transition-all duration-300">
              Become a Partner
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border border-white/20 bg-white/10 text-white font-extrabold text-base hover:bg-white/20 transition-all duration-300">
              Contact Partnership Team
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
