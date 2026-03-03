export const metadata = {
  title: 'Blog - MillionFlats',
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Blog</h1>
            <p className="mt-4 text-lg text-gray-600">
              Insights, market updates, and guides from the MillionFlats team.
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10">
            <div className="text-sm font-semibold text-dark-blue">Coming Soon</div>
            <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-gray-900">A professional blog experience is on the way.</div>
            <div className="mt-3 text-gray-600">
              We are preparing high-quality articles on Dubai real estate, investment strategy, and platform updates.
            </div>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href="/contact"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Contact Us
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
