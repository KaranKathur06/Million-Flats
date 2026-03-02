export const metadata = {
  title: '3D Immersive Tours - MillionFlats',
}

export default function Service3DToursPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Step Inside Your Future Home – Without Leaving Yours</h1>
            <p className="mt-4 text-lg text-gray-600">
              Experience properties like never before with our interactive, walkable 3D tours. Explore every room, check the view, and feel the
              space – all from your device.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="#pricing" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                Book a 3D Tour
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
              <h2 className="text-2xl font-serif font-bold text-dark-blue">What Are 3D Immersive Tours?</h2>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                Unlike static photos or basic 360° spins, our 3D tours let you truly walk through a property. Using professional-grade Matterport
                technology and AI-enhanced rendering, we create digital twins of real spaces that you can navigate freely.
              </p>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                Properties with 3D virtual tours receive significantly more inquiries than those with static images alone. For NRIs and out-of-town
                buyers, this is no longer a luxury – it’s essential.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7 self-start h-fit">
              <h3 className="text-lg font-semibold text-dark-blue">Highlights</h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['True walkthrough navigation', 'Understand flow and proportions naturally'],
                  ['Dollhouse view', 'Bird’s-eye perspective of the full layout'],
                  ['Floor plan integration', 'Navigate quickly and share clearly'],
                  ['Measurement tool', 'Plan furniture placement with confidence'],
                  ['4K HDR photography', 'High-resolution stills for brochures and ads'],
                  ['VR ready', 'Compatible with VR headsets'],
                ].map((it) => (
                  <div key={it[0]} className="rounded-2xl bg-white border border-blue-100 p-4">
                    <div className="font-semibold text-gray-900">{it[0]}</div>
                    <div className="mt-1 text-gray-600 text-xs">{it[1]}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-6">
              {[
                ['1', 'You Share Access', 'Provide keys or access to the property.'],
                ['2', 'We Capture', 'Certified photographers scan the property.'],
                ['3', 'We Process', 'AI stitching creates your digital twin (24–48h).'],
                ['4', 'You Receive', 'Interactive tour + HDR photos + floor plans.'],
                ['5', 'You Share', 'Publish on your website, social media, portals.'],
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
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing – 3D Tours</h2>
              <p className="mt-2 text-gray-600 text-sm">Prices for Mumbai, Delhi, Bangalore metros. Other cities may vary by ±10%.</p>
            </div>
            <a href="/contact" className="text-sm font-semibold text-dark-blue hover:underline">
              Get a custom quote
            </a>
          </div>

          <div className="mt-6 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Package</th>
                    <th className="text-left font-semibold px-6 py-4">Property Size</th>
                    <th className="text-left font-semibold px-6 py-4">Price (₹)</th>
                    <th className="text-left font-semibold px-6 py-4">Includes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Studio / 1BHK', 'Up to 600 sq.ft.', '₹15,000', 'Interactive 3D tour, 5 HDR photos, basic floor plan, 12 months hosting'],
                    ['2BHK / 3BHK', '601–1,500 sq.ft.', '₹25,000', 'Interactive 3D tour, 10 HDR photos, detailed floor plan, measurement tool, 12 months hosting'],
                    ['4BHK+ / Villa', '1,501–3,500 sq.ft.', '₹40,000', 'Interactive 3D tour, 15+ HDR photos, dollhouse view, measurement tool, 12 months hosting'],
                    ['Commercial / Large', '3,500+ sq.ft.', 'Custom quote', 'Everything above + multiple scan points, custom branding'],
                  ].map((r) => (
                    <tr key={r[0]} className="bg-white">
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

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
              <h3 className="text-lg font-semibold text-dark-blue">Add-Ons</h3>
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <div>Virtual staging: ₹5,000 per room</div>
                <div>Aerial drone tour: ₹15,000</div>
                <div>Additional 12 months hosting: ₹3,000</div>
              </div>
            </div>
            <div className="rounded-3xl border border-blue-200 bg-blue-50 shadow-sm p-7">
              <h3 className="text-lg font-semibold text-dark-blue">Ready to book?</h3>
              <p className="mt-2 text-sm text-gray-700">We’ll schedule capture and deliver your interactive tour quickly.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a href="/contact" className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95">
                  Contact team
                </a>
                <a href="/agents" className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50">
                  Find an agent
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-dark-blue">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="text-white font-serif font-bold text-3xl">Book a 3D Tour</div>
            <div className="mt-3 text-white/80">Give buyers confidence with immersive viewing.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="/contact" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
