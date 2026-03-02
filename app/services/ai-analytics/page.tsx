export const metadata = {
  title: 'AI Analytics (Verix™) - MillionFlats',
}

export default function ServiceAIAnalyticsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Make Data-Backed Property Decisions</h1>
            <p className="mt-4 text-lg text-gray-600">
              Our Verix™ AI suite analyzes millions of data points to give you accurate pricing, investment forecasts, and risk assessment – so you
              never rely on guesswork again.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="/agents/pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                Explore AI Tools
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
              <h2 className="text-2xl font-serif font-bold text-dark-blue">What Is Verix™ AI Analytics?</h2>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                Our proprietary Verix™ AI suite analyzes locality growth patterns, historical sales signals, infrastructure impact, amenities, and market
                trends to generate insights that would take humans weeks to compile.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7 self-start h-fit">
              <h3 className="text-lg font-semibold text-dark-blue">Verix™ Trust Scores</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['VerixView™', 'Authenticity – Is the property as presented?'],
                  ['VerixShield™', 'Pricing fairness – Flags over/under-pricing'],
                  ['VerixIndex™', 'Investment potential – Forecasts appreciation'],
                  ['VerixTitle™', 'Legal safety – Checks for hidden issues'],
                  ['VerixPro™', 'Agent performance – Who can you trust?'],
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
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Key Features</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Feature</th>
                    <th className="text-left font-semibold px-6 py-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Automated Valuation Model (AVM)', 'Accurate property valuations in seconds'],
                    ['Neighborhood heatmaps', 'Visualize price trends and growth corridors'],
                    ['Comparable market analysis', 'Instant access to similar property sales'],
                    ['Rental yield calculator', 'Project rental income with hyperlocal signals'],
                    ['Risk flagging', 'AI identifies legal, structural, or title risks early'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-semibold">{r[0]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing – AI Analytics (Agent Subscription)</h2>
          <p className="mt-2 text-gray-600 text-sm">Same tiers as Agent Subscription Plans.</p>
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Plan</th>
                    <th className="text-left font-semibold px-6 py-4">Annual Price</th>
                    <th className="text-left font-semibold px-6 py-4">Monthly Equivalent</th>
                    <th className="text-left font-semibold px-6 py-4">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Basic', '₹9,999', '₹833/month', 'Individual agents, starters'],
                    ['Professional', '₹24,999', '₹2,083/month', 'Established agents, steady business'],
                    ['Premium', '₹49,999', '₹4,166/month', 'Top agents, small agencies'],
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

          <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h3 className="text-xl font-serif font-bold text-dark-blue">What{'\''}s Included</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Feature</th>
                    <th className="text-left font-semibold px-6 py-4">Basic</th>
                    <th className="text-left font-semibold px-6 py-4">Professional</th>
                    <th className="text-left font-semibold px-6 py-4">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['VerixView™ (Authenticity)', '✓ Basic', '✓ Full', '✓ Full + Priority'],
                    ['VerixShield™ (Pricing)', '✗', '✓', '✓ + Alerts'],
                    ['VerixIndex™ (Investment)', '✗', '✓ Basic', '✓ Advanced'],
                    ['VerixPro™ Agent Score', '✓ Standard', '✓ Enhanced', '✓ Featured Badge'],
                    ['Property valuations', '50/month', '200/month', 'Unlimited'],
                    ['Neighborhood heatmaps', '✗', '✓', '✓'],
                    ['Lead alerts', 'Weekly', 'Daily', 'Real-time'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-medium">{r[0]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[1]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[2]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/agents/pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
              View Agent Subscription Plans
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      <section className="bg-dark-blue">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="text-white font-serif font-bold text-3xl">Unlock Verix™ AI Tools</div>
            <div className="mt-3 text-white/80">Upgrade your workflow with AI-driven insights.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="/agents/pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                See Plans
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
