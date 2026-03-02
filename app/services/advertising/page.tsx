export const metadata = {
  title: 'Premium Ads - MillionFlats',
}

export default function ServiceAdvertisingPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Reach Thousands of High-Intent Property Buyers</h1>
            <p className="mt-4 text-lg text-gray-600">
              Targeted advertising on India’s fastest-growing PropTech platform. Display your brand to investors, NRIs, and homebuyers actively
              searching.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="#pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                Advertise With Us
              </a>
              <a href="#options" className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
                View Options
              </a>
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Why Advertise on MillionFlats?</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Audience</th>
                    <th className="text-left font-semibold px-6 py-4">Reach</th>
                    <th className="text-left font-semibold px-6 py-4">Demographics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Monthly active users', '50,000+', '65% male, 35% female'],
                    ['NRI visitors', '15,000+', 'UAE, USA, UK, Canada, Singapore'],
                    ['Agent/Developer visitors', '8,000+', 'Decision-makers actively listing'],
                    ['Average session duration', '8.5 minutes', 'Highly engaged audience'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-semibold">{r[0]}</td>
                      <td className="px-6 py-4 text-dark-blue font-semibold">{r[1]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="options" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Advertising Options</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Ad Type</th>
                    <th className="text-left font-semibold px-6 py-4">Description</th>
                    <th className="text-left font-semibold px-6 py-4">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Homepage banner', 'Premium placement at the top of MillionFlats homepage', 'Brand awareness, new project launches'],
                    ['Category pages', 'Banners on search results and listing pages', 'Targeting active property seekers'],
                    ['Newsletter sponsorship', 'Featured in weekly email to subscribers', 'Direct communication with engaged audience'],
                    ['WhatsApp broadcast', 'Promotional message sent to our groups', 'Immediate reach, high open rates'],
                    ['Social media takeover', 'Dedicated posts on Instagram & LinkedIn', 'Viral potential, brand building'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-semibold">{r[0]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[1]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[2]}</td>
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
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing – Premium Ads</h2>
          <p className="mt-2 text-gray-600 text-sm">Custom campaigns available for combined packages.</p>

          <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Ad Type</th>
                    <th className="text-left font-semibold px-6 py-4">Duration</th>
                    <th className="text-left font-semibold px-6 py-4">Price (₹)</th>
                    <th className="text-left font-semibold px-6 py-4">Impressions (Min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Homepage banner', '1 Week', '₹15,000', '25,000'],
                    ['Homepage banner', '1 Month', '₹45,000 (save 25%)', '1,00,000'],
                    ['Category page banner', '1 Month', '₹25,000', '50,000'],
                    ['Newsletter sponsorship', 'Single issue', '₹12,000', '10,000 opens'],
                    ['Newsletter sponsorship', '4 issues', '₹40,000 (save 17%)', '40,000 opens'],
                    ['WhatsApp broadcast', 'Single broadcast', '₹8,000', '5,000+ reach'],
                    ['WhatsApp broadcast', '4 broadcasts', '₹28,000 (save 12%)', '20,000+ reach'],
                    ['Social media takeover', '1 Day', '₹20,000', '50,000+ reach'],
                    ['Social media takeover', '1 Week', '₹1,20,000 (save 14%)', '3,50,000+ reach'],
                  ].map((r, idx) => (
                    <tr key={`${r[0]}-${idx}`} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-semibold">{r[0]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[1]}</td>
                      <td className="px-6 py-4 text-dark-blue font-semibold">{r[2]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/contact" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
              Request a Media Kit
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
            <div className="text-white font-serif font-bold text-3xl">Run a Premium Campaign</div>
            <div className="mt-3 text-white/80">Reach high-intent buyers on MillionFlats.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="/contact" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                Get a Quote
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
