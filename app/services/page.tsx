export const metadata = {
  title: 'Services - MillionFlats',
}

export default function ServicesIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">MillionFlats Services</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl">
            Premium tools and services for buyers, agents, and partners.
          </p>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: '3D Immersive Tours',
                desc: 'Interactive walkthrough tours, HDR photos, and floor plans.',
                href: '/services/3d-tours',
              },
              {
                title: 'AI Analytics (Verix™)',
                desc: 'Pricing fairness, investment potential, risk signals, and trust scores.',
                href: '/services/ai-analytics',
              },
              {
                title: 'Featured Listings',
                desc: 'Premium placement and boosted visibility for serious buyers.',
                href: '/services/featured-listings',
              },
              {
                title: 'Premium Ads',
                desc: 'Targeted campaigns to reach high-intent property buyers.',
                href: '/services/advertising',
              },
              {
                title: 'Partnerships',
                desc: 'Join our ecosystem and receive qualified lead flow.',
                href: '/services/partnerships',
              },
            ].map((s) => (
              <a key={s.href} href={s.href} className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7 hover:shadow-md transition-shadow">
                <div className="text-dark-blue font-semibold">{s.title}</div>
                <div className="mt-2 text-sm text-gray-600">{s.desc}</div>
                <div className="mt-5 text-sm font-semibold text-dark-blue">View</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
