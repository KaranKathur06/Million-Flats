export default function FeaturedDevelopers() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">BUILT BY THE BEST</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Developers</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Partner onboarding coming soon
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl px-6 py-8">
              <p className="text-sm font-semibold text-dark-blue">Partner onboarding coming soon</p>
              <p className="mt-2 text-sm text-gray-600">We’re onboarding reputable developers for verified inventory.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
