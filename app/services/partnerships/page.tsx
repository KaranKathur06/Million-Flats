export const metadata = {
  title: 'Partnerships - MillionFlats',
}

export default function ServicePartnershipsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Partner with MillionFlats – Grow Your Business</h1>
            <p className="mt-4 text-lg text-gray-600">
              Join our ecosystem of trusted real estate partners and connect with thousands of active buyers, sellers, and investors.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="/partnerships" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                Become a Partner
              </a>
              <a href="#pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
                View Pricing
              </a>
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7 self-start h-fit">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Why Partner With Us?</h2>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                MillionFlats is building India’s most trusted real estate ecosystem. Partner to access a growing network of qualified, high-intent
                customers at the exact moment they need your services.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7 self-start h-fit">
              <h3 className="text-lg font-semibold text-dark-blue">Partner Benefits</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Qualified lead flow', 'Receive pre-screened customers actively transacting'],
                  ['MillionFlats Verified badge', 'Build instant credibility with our trust mark'],
                  ['Profile on our website', 'Featured in partner directory with offerings'],
                  ['Partner dashboard', 'Track leads, performance, and payments'],
                  ['Co-marketing', 'Webinars, events, and content collaborations'],
                  ['First access', 'Beta test new tools before public launch'],
                ].map((r) => (
                  <div key={r[0]} className="rounded-2xl bg-white border border-blue-100 p-4">
                    <div className="font-semibold text-gray-900">{r[0]}</div>
                    <div className="mt-1 text-xs text-gray-600">{r[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Partner Categories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {[
                ['Home Loans & Finance', 'Banks, NBFCs, housing finance companies'],
                ['Legal & Documentation', 'Law firms, notaries, document specialists'],
                ['Property Insurance', 'Insurance providers, brokers'],
                ['Interior Design & Renovation', 'Design firms, contractors, modular kitchen brands'],
                ['Packers & Movers', 'Relocation companies, logistics providers'],
                ['Property Management', 'Firms managing rental properties'],
                ['Vastu / Feng Shui', 'Consultants, practitioners'],
              ].map((c) => (
                <div key={c[0]} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="font-semibold text-gray-900">{c[0]}</div>
                  <div className="mt-2 text-sm text-gray-600">{c[1]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">How Partnering Works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {[
                ['Apply', 'Fill out our partner application form'],
                ['We verify', 'Our team reviews your credentials'],
                ['Agreement', 'Sign our simple partner agreement'],
                ['Onboarding', 'Get listed and start receiving leads'],
              ].map((s) => (
                <div key={s[0]} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="font-semibold text-gray-900">{s[0]}</div>
                  <div className="mt-2 text-sm text-gray-600">{s[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing – Partnerships</h2>
          <p className="mt-2 text-gray-600 text-sm">Enterprise & revenue share options available.</p>

          <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Partner Tier</th>
                    <th className="text-left font-semibold px-6 py-4">Annual Fee (₹)</th>
                    <th className="text-left font-semibold px-6 py-4">Lead Allocation</th>
                    <th className="text-left font-semibold px-6 py-4">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Basic Partner', '₹9,999', 'Up to 50 leads/year', 'Individual professionals, freelancers'],
                    ['Preferred Partner', '₹24,999', 'Up to 200 leads/year', 'Small firms, growing businesses'],
                    ['Strategic Partner', '₹49,999', 'Unlimited leads', 'Large enterprises, banks'],
                    ['Enterprise', 'Custom', 'Custom', 'National chains, multiple locations'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-semibold">{r[0]}</td>
                      <td className="px-6 py-4 text-dark-blue font-semibold">{r[1]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[2]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7">
            <div className="text-dark-blue font-semibold">Revenue Share Alternative</div>
            <div className="mt-2 text-gray-700 text-sm">
              For high-volume partners, we offer 10–20% revenue share on closed transactions instead of annual fee.
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/partnerships" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
              Apply Now
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
              Talk to Partnerships
            </a>
          </div>
        </div>
      </section>

      <section className="bg-dark-blue">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="text-white font-serif font-bold text-3xl">Become a Trusted Partner</div>
            <div className="mt-3 text-white/80">Join the MillionFlats ecosystem and grow with qualified leads.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="/partnerships" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                Apply
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
