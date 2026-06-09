import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">404</p>
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Page not found</h1>
            <p className="mt-4 text-lg text-gray-600">
              The page you requested does not exist, may have been moved, or is not published yet.
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10">
            <div className="text-sm font-semibold text-dark-blue">What you can do</div>
            <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-gray-900">
              Browse live listings or contact our team
            </div>
            <div className="mt-3 text-gray-600">
              Try the projects directory, ecosystem partners hub, or reach out if you followed a broken link.
            </div>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Browse Projects
              </Link>
              <Link
                href="/ecosystem-partners"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Ecosystem Partners
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
