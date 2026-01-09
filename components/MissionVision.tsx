export default function MissionVision() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mission */}
          <div className="bg-white rounded-lg p-8 shadow-md">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-serif font-bold text-dark-blue mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              To democratize access to the world&apos;s most exclusive luxury properties, connecting visionary investors and discerning buyers with properties that exceed their expectations while maintaining the highest standards of trust, transparency, and service excellence.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white rounded-lg p-8 shadow-md">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-serif font-bold text-dark-blue mb-4">Our Vision</h2>
            <p className="text-gray-700 leading-relaxed">
              To become the global standard for luxury real estate, recognized worldwide as the platform of choice for premium property transactions. A destination where quality meets innovation, creating meaningful connections between exceptional properties and exceptional people.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

