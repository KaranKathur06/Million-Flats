export const metadata = {
  title: 'Featured Listings - MillionFlats',
}

export default function ServiceFeaturedListingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Get Your Property Seen by Serious Buyers</h1>
            <p className="mt-4 text-lg text-gray-600">
              Premium placement. Verified trust scores. AI-matched leads. Your listing deserves maximum visibility.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="#pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                Feature Your Property
              </a>
              <a href="#how" className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
                How it works
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
              <h2 className="text-2xl font-serif font-bold text-dark-blue">What Are Featured Listings?</h2>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                Featured Listings get priority placement in search results, category pages, and AI-driven buyer recommendations. Your property isn’t
                just listed – it’s promoted to high-intent buyers actively searching.
              </p>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                Premium placement typically drives more views and more inquiries than standard listings.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7 self-start h-fit">
              <h3 className="text-lg font-semibold text-dark-blue">Why Feature Your Listing?</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Top of search results', 'Appear before non-featured listings'],
                  ['Featured badge', 'Stand out with a visual trust marker'],
                  ['AI priority matching', 'Recommended to matched buyers first'],
                  ['Verix™ score display', 'Showcase verified trust scores prominently'],
                  ['Social media promotion', 'Featured on Instagram/LinkedIn'],
                  ['WhatsApp broadcast', 'Included in weekly property alerts'],
                ].map((r) => (
                  <div key={r[0]} className="rounded-2xl bg-white border border-blue-100 p-4">
                    <div className="font-semibold text-gray-900">{r[0]}</div>
                    <div className="mt-1 text-xs text-gray-600">{r[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">How It Works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
              {[
                ['1', 'List your property', 'Basic listing is free'],
                ['2', 'Upgrade to Featured', 'Pick duration and placement'],
                ['3', 'Get verified', 'Optional 3D + Verix™ signals'],
                ['4', 'Reach more buyers', 'Priority placement everywhere'],
              ].map((s) => (
                <div key={s[0]} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="text-dark-blue font-bold text-lg">{s[0]}</div>
                  <div className="mt-2 font-semibold text-gray-900">{s[1]}</div>
                  <div className="mt-2 text-sm text-gray-600">{s[2]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing – Featured Listings</h2>
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Duration</th>
                    <th className="text-left font-semibold px-6 py-4">Price (₹)</th>
                    <th className="text-left font-semibold px-6 py-4">Best For</th>
                    <th className="text-left font-semibold px-6 py-4">Includes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['1 Month', '₹2,999', 'Urgent sale, quick test', 'Featured badge, top search placement'],
                    ['3 Months', '₹7,999 (save 11%)', 'Standard sale timeline', 'Everything above + social media feature'],
                    ['6 Months', '₹14,999 (save 17%)', 'Luxury properties', 'Everything + WhatsApp broadcast, newsletter feature'],
                    ['12 Months', '₹24,999 (save 30%)', 'Ongoing rental/developer portfolio', 'All benefits + priority support'],
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
            <div className="text-dark-blue font-semibold">Add-On</div>
            <div className="mt-2 text-gray-700 text-sm">3D Tour Bundle: Add 3D tour at 20% discount when booking Featured Listing</div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/sell" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
              List a Property
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
            <div className="text-white font-serif font-bold text-3xl">Boost Your Listing Visibility</div>
            <div className="mt-3 text-white/80">Get seen by serious buyers and investors.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="#pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                View Packages
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
